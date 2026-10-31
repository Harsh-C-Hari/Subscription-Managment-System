"""routers/billing/payments.py — Payment recording and queries (API_CONTRACT §12)."""
from datetime import date, datetime
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, cast, Date

from app.core.deps import get_db, require_roles
from app.models.payment import Payment
from app.models.user import User
from app.schemas.payment import (
    PaymentCreate,
    PaymentOut,
    InvoiceStatusMini,
    PaymentResponse,
)
from app.schemas.common import AppException, paginate_list, PaginatedResponse
from app.services.payment_service import record_payment

router = APIRouter(tags=["Payments"])


def _get_payment_or_404(db: Session, payment_id: UUID, current_user: User) -> Payment:
    payment = db.get(Payment, payment_id)
    if not payment:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Payment not found",
        )
    # Customer isolation: customers see only their own records (404 for others)
    if current_user.role == "customer" and payment.customer_id != current_user.id:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Payment not found",
        )
    return payment


@router.post(
    "/invoices/{invoice_id}/payments",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_payment(
    invoice_id: UUID,
    body: PaymentCreate,
    current_user: User = Depends(require_roles("admin", "staff")),
    db: Session = Depends(get_db),
):
    payment, inv = record_payment(db, invoice_id, body, current_user.id)
    inv_mini = InvoiceStatusMini(
        id=inv.id,
        status=inv.status,
        total=inv.total,
        amount_paid=inv.amount_paid,
        outstanding=inv.outstanding,
    )
    return PaymentResponse(
        payment=PaymentOut.model_validate(payment),
        invoice=inv_mini,
    )


@router.get("/payments", response_model=PaginatedResponse[PaymentOut])
def list_payments(
    invoice_id: Optional[UUID] = None,
    customer_id: Optional[UUID] = None,
    method: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort: str = "-paid_at",
    current_user: User = Depends(require_roles("admin", "staff", "customer")),
    db: Session = Depends(get_db),
):
    q = db.query(Payment)

    # Customer isolation
    if current_user.role == "customer":
        q = q.filter(Payment.customer_id == current_user.id)
    elif customer_id is not None:
        q = q.filter(Payment.customer_id == customer_id)

    if invoice_id is not None:
        q = q.filter(Payment.invoice_id == invoice_id)

    if method is not None:
        q = q.filter(Payment.method == method)

    if from_date is not None:
        q = q.filter(cast(Payment.paid_at, Date) >= from_date)

    if to_date is not None:
        q = q.filter(cast(Payment.paid_at, Date) <= to_date)

    sort_field = sort.lstrip("-")
    col = getattr(Payment, sort_field, Payment.paid_at)
    if sort.startswith("-"):
        q = q.order_by(desc(col))
    else:
        q = q.order_by(asc(col))

    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return paginate_list(
        [PaymentOut.model_validate(p) for p in items],
        total,
        page,
        page_size,
    )


@router.get("/payments/{payment_id}", response_model=PaymentOut)
def get_payment(
    payment_id: UUID,
    current_user: User = Depends(require_roles("admin", "staff", "customer")),
    db: Session = Depends(get_db),
):
    payment = _get_payment_or_404(db, payment_id, current_user)
    return PaymentOut.model_validate(payment)
