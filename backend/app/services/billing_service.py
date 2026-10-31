"""
services/billing_service.py

Core billing logic:
  - generate_invoice: single-subscription invoice generation inside ONE transaction
  - run_billing: bulk billing, per-subscription transaction isolation
  - advance_subscription: advances next_billing_date, auto-closes if done

Key rules (PROJECT_SPEC §8.4):
  - period_start = next_billing_date
  - period_end = advance(period_start) - 1 day
  - UNIQUE index on (subscription_id, period_start) WHERE status <> 'cancelled'
    → catches duplicates as IntegrityError → 409 DUPLICATE_BILLING
  - Discount usage increment: UPDATE WHERE used_count < usage_limit (atomic)
  - Invoice number sequence: INV-YYYY-NNNNNN
"""
import uuid
from datetime import date, datetime, timezone, timedelta
from decimal import Decimal
from typing import Optional

from sqlalchemy import update, text
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import status

from app.models.subscription import Subscription
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.discount import Discount
from app.models.tax import Tax
from app.schemas.common import AppException
from app.services.dates import advance_date, compute_period_end
from app.services.pricing import calculate_invoice_totals, is_discount_eligible
from app.services.money import quantize, ZERO


def _next_inv_number(db: Session) -> str:
    year = date.today().year
    prefix = f"INV-{year}-"
    last_inv = (
        db.query(Invoice.invoice_number)
        .filter(Invoice.invoice_number.like(f"{prefix}%"))
        .order_by(Invoice.invoice_number.desc())
        .first()
    )
    if last_inv and last_inv[0]:
        try:
            num = int(last_inv[0].split("-")[-1])
            return f"INV-{year}-{num + 1:06d}"
        except Exception:
            pass
    count = db.query(Invoice).count()
    return f"INV-{year}-{count + 1:06d}"


def _try_claim_discount(db: Session, discount_id: uuid.UUID) -> bool:
    """
    Atomically increment used_count only if under usage_limit.
    Returns True if the discount was claimed, False otherwise.
    """
    result = db.execute(
        update(Discount)
        .where(
            Discount.id == discount_id,
            (Discount.usage_limit == None) | (Discount.used_count < Discount.usage_limit),
        )
        .values(used_count=Discount.used_count + 1)
        .returning(Discount.id)
    )
    return result.scalar_one_or_none() is not None



def generate_invoice(
    db: Session,
    subscription_id: uuid.UUID,
    as_of_date: Optional[date] = None,
) -> Invoice:
    """
    Generate one invoice for a subscription.
    Raises AppException on:
      - Subscription not active (409 INVALID_TRANSITION)
      - next_billing_date in the future (409 NOT_DUE)
      - Already billed this period (409 DUPLICATE_BILLING)
    """
    today = as_of_date or date.today()

    sub = db.get(Subscription, subscription_id)
    if not sub:
        raise AppException(status_code=404, code="NOT_FOUND", message="Subscription not found")
    if sub.status != "active":
        raise AppException(status_code=409, code="INVALID_TRANSITION",
                           message="Subscription is not active")
    if sub.next_billing_date is None or sub.next_billing_date > today:
        raise AppException(status_code=409, code="NOT_DUE",
                           message="Subscription is not due for billing yet")

    from app.models.plan import Plan
    plan = sub.plan or db.get(Plan, sub.plan_id)

    period_start = sub.next_billing_date
    period_end = compute_period_end(period_start, plan.billing_period, sub.billing_anchor_day)

    # Check for existing non-cancelled invoice for this period
    existing = (
        db.query(Invoice)
        .filter(
            Invoice.subscription_id == sub.id,
            Invoice.period_start == period_start,
            Invoice.status != "cancelled",
        )
        .first()
    )
    if existing:
        raise AppException(
            status_code=409,
            code="DUPLICATE_BILLING",
            message="Invoice already exists for this period",
        )


    # Calculate totals
    items_data = [{"quantity": it.quantity, "unit_price": it.unit_price} for it in sub.items]

    tax_rate = ZERO
    tax_id_snapshot = None
    if sub.tax_id:
        tax = db.get(Tax, sub.tax_id)
        if tax and tax.is_active:
            tax_rate = tax.rate
            tax_id_snapshot = tax.id

    # Discount eligibility pre-check (pure logic)
    discount_id_snapshot = None
    discount_type = None
    discount_value = None
    if sub.discount_id:
        disc = db.get(Discount, sub.discount_id)
        if disc:
            subtotal_preview = sum(
                quantize(Decimal(str(it["quantity"])) * it["unit_price"])
                for it in items_data
            )
            if is_discount_eligible(
                {
                    "is_active": disc.is_active,
                    "valid_from": disc.valid_from,
                    "valid_until": disc.valid_until,
                    "usage_limit": disc.usage_limit,
                    "used_count": disc.used_count,
                    "min_amount": disc.min_amount,
                },
                subtotal_preview,
                today,
            ):
                discount_type = disc.type
                discount_value = disc.value
                discount_id_snapshot = disc.id

    totals = calculate_invoice_totals(
        items_data,
        tax_rate=tax_rate,
        discount_type=discount_type,
        discount_value=discount_value,
    )

    issue_date = today
    due_date = issue_date + timedelta(days=14)

    inv = Invoice(
        id=uuid.uuid4(),
        invoice_number=_next_inv_number(db),
        subscription_id=sub.id,
        customer_id=sub.customer_id,
        status="draft",
        period_start=period_start,
        period_end=period_end,
        issue_date=issue_date,
        due_date=due_date,
        subtotal=totals["subtotal"],
        discount_id=discount_id_snapshot,
        discount_amount=totals["discount_amount"],
        tax_id=tax_id_snapshot,
        tax_rate=tax_rate,
        tax_amount=totals["tax_amount"],
        total=totals["total"],
        amount_paid=ZERO,
    )
    db.add(inv)

    for si in sub.items:
        lt = quantize(Decimal(str(si.quantity)) * si.unit_price)
        db.add(InvoiceItem(
            id=uuid.uuid4(),
            invoice_id=inv.id,
            product_id=si.product_id,
            variant_id=si.variant_id,
            description=si.description,
            quantity=si.quantity,
            unit_price=si.unit_price,
            line_total=lt,
        ))

    # Atomic discount usage claim
    if discount_id_snapshot:
        claimed = _try_claim_discount(db, discount_id_snapshot)
        if not claimed:
            # Discount limit was hit between check and update — generate without discount
            inv.discount_id = None
            inv.discount_amount = ZERO
            inv.tax_amount = quantize(totals["subtotal"] * tax_rate / Decimal("100"))
            inv.total = totals["subtotal"] + inv.tax_amount

    # Advance next_billing_date
    next_bd = advance_date(period_start, plan.billing_period, sub.billing_anchor_day)
    sub.next_billing_date = next_bd

    # Auto-close if end_date surpassed and plan.auto_close
    if plan.auto_close and sub.end_date and next_bd > sub.end_date:
        sub.status = "closed"
        sub.closed_at = datetime.now(timezone.utc)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        err_msg = str(getattr(exc, "orig", exc))
        if "uq_invoice_sub_period" in err_msg or "unique" in err_msg.lower() or "duplicate" in err_msg.lower():
            raise AppException(status_code=409, code="DUPLICATE_BILLING",
                               message="Invoice already exists for this period")
        raise


    db.refresh(inv)
    return inv


def run_billing(db: Session, as_of_date: Optional[date] = None):
    """
    Bulk billing: generate invoices for all eligible subscriptions.
    Each subscription runs in its own try/except so one failure doesn't block others.
    Returns a RunBillingResult-compatible dict.
    """
    today = as_of_date or date.today()

    eligible = db.query(Subscription).filter(
        Subscription.status == "active",
        Subscription.next_billing_date <= today,
    ).all()

    # Filter by end_date in Python (simple)
    eligible = [
        s for s in eligible
        if s.end_date is None or s.next_billing_date <= s.end_date
    ]

    created = 0
    skipped_duplicate = 0
    skipped_not_due = 0
    failed = 0
    invoices = []
    errors = []

    for sub in eligible:
        try:
            inv = generate_invoice(db, sub.id, as_of_date=today)
            created += 1
            invoices.append({
                "subscription_id": sub.id,
                "invoice_id": inv.id,
                "invoice_number": inv.invoice_number,
            })
        except AppException as e:
            if e.code == "DUPLICATE_BILLING":
                skipped_duplicate += 1
            elif e.code == "NOT_DUE":
                skipped_not_due += 1
            else:
                failed += 1
                errors.append({"subscription_id": sub.id, "error": e.message})
        except Exception as e:
            db.rollback()
            failed += 1
            errors.append({"subscription_id": sub.id, "error": str(e)})

    return {
        "as_of_date": today,
        "created": created,
        "skipped_duplicate": skipped_duplicate,
        "skipped_not_due": skipped_not_due,
        "failed": failed,
        "invoices": invoices,
        "errors": errors,
    }
