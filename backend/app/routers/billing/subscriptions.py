"""routers/billing/subscriptions.py — Subscription CRUD & lifecycle actions (API_CONTRACT §10)."""
import uuid
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_

from app.core.deps import get_db, require_roles
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionUpdate,
    ActivateBody,
    SubscriptionOut,
)
from app.schemas.common import AppException, paginate_list, PaginatedResponse
from app.services import subscription_service

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


def _get_sub_or_404(db: Session, sub_id: UUID, current_user: User) -> Subscription:
    sub = db.get(Subscription, sub_id)
    if not sub:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Subscription not found",
        )
    # Customer isolation: customers see only their own records (404 for others)
    if current_user.role == "customer" and sub.customer_id != current_user.id:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Subscription not found",
        )
    return sub


@router.get("", response_model=PaginatedResponse[SubscriptionOut])
def list_subscriptions(
    status_filter: Optional[str] = Query(None, alias="status"),
    customer_id: Optional[UUID] = None,
    plan_id: Optional[UUID] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort: str = "-created_at",
    current_user: User = Depends(require_roles("admin", "staff", "customer")),
    db: Session = Depends(get_db),
):
    q = db.query(Subscription)

    # Customer isolation
    if current_user.role == "customer":
        q = q.filter(Subscription.customer_id == current_user.id)
    elif customer_id is not None:
        q = q.filter(Subscription.customer_id == customer_id)

    if status_filter is not None:
        q = q.filter(Subscription.status == status_filter)

    if plan_id is not None:
        q = q.filter(Subscription.plan_id == plan_id)

    if search:
        like = f"%{search}%"
        # Search on number or customer full_name
        q = q.join(Subscription.customer).filter(
            or_(
                Subscription.subscription_number.ilike(like),
                User.full_name.ilike(like),
            )
        )

    sort_field = sort.lstrip("-")
    col = getattr(Subscription, sort_field, Subscription.created_at)
    if sort.startswith("-"):
        q = q.order_by(desc(col))
    else:
        q = q.order_by(asc(col))

    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return paginate_list(
        [SubscriptionOut.model_validate(s) for s in items],
        total,
        page,
        page_size,
    )


@router.post("", response_model=SubscriptionOut, status_code=status.HTTP_201_CREATED)
def create_subscription(
    body: SubscriptionCreate,
    current_user: User = Depends(require_roles("admin", "staff")),
    db: Session = Depends(get_db),
):
    sub = subscription_service.create_subscription(db, body, current_user.id)
    return SubscriptionOut.model_validate(sub)


@router.get("/{subscription_id}", response_model=SubscriptionOut)
def get_subscription(
    subscription_id: UUID,
    current_user: User = Depends(require_roles("admin", "staff", "customer")),
    db: Session = Depends(get_db),
):
    sub = _get_sub_or_404(db, subscription_id, current_user)
    return SubscriptionOut.model_validate(sub)


@router.put("/{subscription_id}", response_model=SubscriptionOut)
def update_subscription(
    subscription_id: UUID,
    body: SubscriptionUpdate,
    current_user: User = Depends(require_roles("admin", "staff")),
    db: Session = Depends(get_db),
):
    sub = _get_sub_or_404(db, subscription_id, current_user)
    updated = subscription_service.update_subscription(db, sub, body)
    return SubscriptionOut.model_validate(updated)


@router.post("/{subscription_id}/send-quotation", response_model=SubscriptionOut)
def send_quotation(
    subscription_id: UUID,
    current_user: User = Depends(require_roles("admin", "staff")),
    db: Session = Depends(get_db),
):
    sub = _get_sub_or_404(db, subscription_id, current_user)
    transitioned = subscription_service.transition_subscription(
        db, sub, "quotation", actor_id=current_user.id
    )
    return SubscriptionOut.model_validate(transitioned)


@router.post("/{subscription_id}/confirm", response_model=SubscriptionOut)
def confirm_subscription(
    subscription_id: UUID,
    current_user: User = Depends(require_roles("admin", "staff")),
    db: Session = Depends(get_db),
):
    sub = _get_sub_or_404(db, subscription_id, current_user)
    transitioned = subscription_service.transition_subscription(
        db, sub, "confirmed", actor_id=current_user.id
    )
    return SubscriptionOut.model_validate(transitioned)


@router.post("/{subscription_id}/activate", response_model=SubscriptionOut)
def activate_subscription(
    subscription_id: UUID,
    body: Optional[ActivateBody] = None,
    current_user: User = Depends(require_roles("admin", "staff")),
    db: Session = Depends(get_db),
):
    sub = _get_sub_or_404(db, subscription_id, current_user)
    sd = body.start_date if body else None
    activated = subscription_service.activate_subscription(db, sub, start_date=sd)
    return SubscriptionOut.model_validate(activated)


@router.post("/{subscription_id}/pause", response_model=SubscriptionOut)
def pause_subscription(
    subscription_id: UUID,
    current_user: User = Depends(require_roles("admin", "staff")),
    db: Session = Depends(get_db),
):
    sub = _get_sub_or_404(db, subscription_id, current_user)
    paused = subscription_service.transition_subscription(
        db, sub, "paused", actor_id=current_user.id
    )
    return SubscriptionOut.model_validate(paused)


@router.post("/{subscription_id}/resume", response_model=SubscriptionOut)
def resume_subscription(
    subscription_id: UUID,
    current_user: User = Depends(require_roles("admin", "staff")),
    db: Session = Depends(get_db),
):
    sub = _get_sub_or_404(db, subscription_id, current_user)
    resumed = subscription_service.transition_subscription(
        db, sub, "active", actor_id=current_user.id
    )
    return SubscriptionOut.model_validate(resumed)


@router.post("/{subscription_id}/close", response_model=SubscriptionOut)
def close_subscription(
    subscription_id: UUID,
    current_user: User = Depends(require_roles("admin", "staff")),
    db: Session = Depends(get_db),
):
    sub = _get_sub_or_404(db, subscription_id, current_user)
    closed = subscription_service.transition_subscription(
        db, sub, "closed", actor_id=current_user.id
    )
    return SubscriptionOut.model_validate(closed)


@router.post(
    "/{subscription_id}/renew",
    response_model=SubscriptionOut,
    status_code=status.HTTP_201_CREATED,
)
def renew_subscription(
    subscription_id: UUID,
    current_user: User = Depends(require_roles("admin", "staff")),
    db: Session = Depends(get_db),
):
    sub = _get_sub_or_404(db, subscription_id, current_user)
    if sub.status not in ("active", "closed"):
        raise AppException(
            status_code=status.HTTP_409_CONFLICT,
            code="INVALID_TRANSITION",
            message=f"Only active or closed subscriptions can be renewed (current: {sub.status})",
        )
    new_sub = subscription_service.renew_subscription(db, sub, current_user.id)
    return SubscriptionOut.model_validate(new_sub)
