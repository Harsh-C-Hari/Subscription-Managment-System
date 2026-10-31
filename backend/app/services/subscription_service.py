"""
services/subscription_service.py

Subscription business logic: create, update, activate, renew, lifecycle actions.
Number generation uses the DB to count existing subscriptions for the sequence.
"""
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional, List

from sqlalchemy.orm import Session
from fastapi import status

from app.models.subscription import Subscription
from app.models.subscription_item import SubscriptionItem
from app.models.quotation_template import QuotationTemplate
from app.models.plan import Plan
from app.models.user import User
from app.models.tax import Tax
from app.models.discount import Discount
from app.schemas.common import AppException
from app.services.state_machine import assert_subscription_transition, InvalidTransitionError
from app.services.dates import advance_date, compute_end_date


def _next_sub_number(db: Session) -> str:
    count = db.query(Subscription).count()
    year = date.today().year
    return f"SUB-{year}-{count + 1:06d}"


def _resolve_items(
    db: Session,
    items_in,
    template_id: Optional[uuid.UUID],
    plan: Plan,
    sub_id: uuid.UUID,
) -> List[SubscriptionItem]:
    """Build SubscriptionItem list from provided items, template, or plan."""
    result = []

    if items_in:
        for it in items_in:
            from app.models.product import Product
            prod = db.get(Product, it.product_id)
            if not prod:
                raise AppException(status_code=422, code="VALIDATION_ERROR",
                                   message=f"Product {it.product_id} not found")
            desc = prod.name
            if it.variant_id:
                from app.models.product_variant import ProductVariant
                var = db.get(ProductVariant, it.variant_id)
                if var:
                    desc = f"{prod.name} – {var.name}"
            result.append(SubscriptionItem(
                subscription_id=sub_id,
                product_id=it.product_id,
                variant_id=it.variant_id,
                description=desc,
                quantity=it.quantity,
                unit_price=it.unit_price,
            ))
    elif template_id:
        tpl = db.get(QuotationTemplate, template_id)
        if not tpl:
            raise AppException(status_code=422, code="VALIDATION_ERROR",
                               message="Quotation template not found")
        for ti in tpl.items:
            result.append(SubscriptionItem(
                subscription_id=sub_id,
                product_id=ti.product_id,
                variant_id=ti.variant_id,
                description=ti.description or "",
                quantity=ti.quantity,
                unit_price=ti.unit_price,
            ))
    else:
        # Fallback: one item from the plan price
        result.append(SubscriptionItem(
            subscription_id=sub_id,
            product_id=plan.product_id or uuid.uuid4(),  # best-effort
            variant_id=None,
            description=plan.name,
            quantity=1,
            unit_price=plan.price,
        ))
    return result


def create_subscription(db: Session, data, created_by_id: uuid.UUID) -> Subscription:
    plan = db.get(Plan, data.plan_id)
    if not plan or not plan.is_active:
        raise AppException(status_code=422, code="VALIDATION_ERROR",
                           message="Plan not found or inactive")

    customer = db.get(User, data.customer_id)
    if not customer or customer.role != "customer":
        raise AppException(status_code=422, code="VALIDATION_ERROR",
                           message="Customer not found")

    sub_id = uuid.uuid4()
    sub = Subscription(
        id=sub_id,
        subscription_number=_next_sub_number(db),
        customer_id=data.customer_id,
        plan_id=data.plan_id,
        template_id=data.template_id,
        tax_id=data.tax_id,
        discount_id=data.discount_id,
        notes=data.notes,
        status="draft",
        created_by=created_by_id,
    )
    db.add(sub)
    db.flush()

    items = _resolve_items(db, data.items, data.template_id, plan, sub_id)
    for item in items:
        db.add(item)

    db.commit()
    db.refresh(sub)
    return sub


def update_subscription(db: Session, sub: Subscription, data) -> Subscription:
    from app.services.state_machine import subscription_can_be_edited
    if not subscription_can_be_edited(sub.status):
        raise AppException(status_code=409, code="INVALID_TRANSITION",
                           message=f"Cannot edit subscription in '{sub.status}' status")

    if data.tax_id is not None:
        sub.tax_id = data.tax_id
    if data.discount_id is not None:
        sub.discount_id = data.discount_id
    if data.notes is not None:
        sub.notes = data.notes

    if data.items is not None:
        for old in sub.items:
            db.delete(old)
        db.flush()
        for it in data.items:
            from app.models.product import Product
            prod = db.get(Product, it.product_id)
            desc = prod.name if prod else str(it.product_id)
            db.add(SubscriptionItem(
                subscription_id=sub.id,
                product_id=it.product_id,
                variant_id=it.variant_id,
                description=desc,
                quantity=it.quantity,
                unit_price=it.unit_price,
            ))

    db.commit()
    db.refresh(sub)
    return sub


def transition_subscription(db: Session, sub: Subscription, to_status: str,
                             actor_id: Optional[uuid.UUID] = None) -> Subscription:
    try:
        assert_subscription_transition(sub.status, to_status)
    except InvalidTransitionError as e:
        raise AppException(status_code=409, code="INVALID_TRANSITION", message=str(e))

    now = datetime.now(timezone.utc)
    sub.status = to_status
    if to_status == "quotation":
        sub.quotation_sent_at = now
    elif to_status == "confirmed":
        sub.confirmed_at = now
    elif to_status == "paused":
        pass
    elif to_status == "closed":
        sub.closed_at = now

    db.commit()
    db.refresh(sub)
    return sub


def activate_subscription(db: Session, sub: Subscription,
                           start_date: Optional[date] = None) -> Subscription:
    try:
        assert_subscription_transition(sub.status, "active")
    except InvalidTransitionError as e:
        raise AppException(status_code=409, code="INVALID_TRANSITION", message=str(e))

    plan = db.get(Plan, sub.plan_id)
    sd = start_date or date.today()
    anchor = sd.day

    end_date = None
    if plan.duration_periods:
        end_date = compute_end_date(sd, plan.billing_period, plan.duration_periods)

    now = datetime.now(timezone.utc)
    sub.status = "active"
    sub.start_date = sd
    sub.billing_anchor_day = anchor
    sub.next_billing_date = sd
    sub.end_date = end_date
    sub.activated_at = now

    db.commit()
    db.refresh(sub)
    return sub


def renew_subscription(db: Session, sub: Subscription, created_by_id: uuid.UUID) -> Subscription:
    """Create a new DRAFT subscription copying the original's plan/items/tax/discount."""
    new_id = uuid.uuid4()
    new_sub = Subscription(
        id=new_id,
        subscription_number=_next_sub_number(db),
        customer_id=sub.customer_id,
        plan_id=sub.plan_id,
        template_id=sub.template_id,
        tax_id=sub.tax_id,
        discount_id=sub.discount_id,
        notes=sub.notes,
        status="draft",
        created_by=created_by_id,
    )
    db.add(new_sub)
    db.flush()

    for old_item in sub.items:
        db.add(SubscriptionItem(
            subscription_id=new_id,
            product_id=old_item.product_id,
            variant_id=old_item.variant_id,
            description=old_item.description,
            quantity=old_item.quantity,
            unit_price=old_item.unit_price,
        ))

    db.commit()
    db.refresh(new_sub)
    return new_sub
