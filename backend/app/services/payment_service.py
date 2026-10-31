"""
services/payment_service.py

Payment recording per PROJECT_SPEC §8.3:
  - Invoice must be confirmed or partially_paid
  - amount > 0
  - amount must not exceed outstanding (422 OVERPAYMENT)
  - SELECT ... FOR UPDATE on invoice row to prevent concurrent overpayment
  - After insert: update amount_paid and status
"""
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.orm import Session
from fastapi import status

from app.models.invoice import Invoice
from app.models.payment import Payment
from app.schemas.common import AppException
from app.services.state_machine import invoice_accepts_payment
from app.services.money import quantize, ZERO


def record_payment(
    db: Session,
    invoice_id: uuid.UUID,
    data,
    recorded_by_id: uuid.UUID,
) -> tuple[Payment, Invoice]:
    """
    Record a payment on an invoice.
    Returns (payment, updated_invoice).
    """
    # Lock the invoice row for update — prevents concurrent overpayment
    inv = (
        db.query(Invoice)
        .filter(Invoice.id == invoice_id)
        .with_for_update()
        .first()
    )
    if not inv:
        raise AppException(status_code=404, code="NOT_FOUND", message="Invoice not found")

    if not invoice_accepts_payment(inv.status):
        raise AppException(
            status_code=409,
            code="INVALID_TRANSITION",
            message=f"Invoice in '{inv.status}' status cannot accept payments",
        )

    amount = quantize(data.amount)
    if amount <= ZERO:
        raise AppException(status_code=422, code="VALIDATION_ERROR",
                           message="Payment amount must be greater than 0")

    outstanding = quantize(inv.total - inv.amount_paid)
    if amount > outstanding:
        raise AppException(
            status_code=422,
            code="OVERPAYMENT",
            message=f"Payment amount {amount} exceeds outstanding {outstanding}",
        )

    paid_at = data.paid_at or datetime.now(timezone.utc)

    payment = Payment(
        id=uuid.uuid4(),
        invoice_id=inv.id,
        customer_id=inv.customer_id,
        amount=amount,
        method=data.method,
        reference=data.reference,
        paid_at=paid_at,
        recorded_by=recorded_by_id,
        notes=getattr(data, "notes", None),
    )
    db.add(payment)

    new_paid = quantize(inv.amount_paid + amount)
    inv.amount_paid = new_paid

    if new_paid >= inv.total:
        inv.status = "paid"
        inv.paid_at = datetime.now(timezone.utc)
    else:
        inv.status = "partially_paid"

    db.commit()
    db.refresh(payment)
    db.refresh(inv)
    return payment, inv
