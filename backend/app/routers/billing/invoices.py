"""routers/billing/invoices.py — Invoice generation, billing run, actions, and queries (API_CONTRACT §11)."""
from datetime import date, datetime, timezone
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_

from app.core.deps import get_db, require_roles
from app.models.invoice import Invoice
from app.models.user import User
from app.schemas.invoice import (
    InvoiceOut,
    GenerateBody,
    RunBillingBody,
    RunBillingResult,
)
from app.schemas.common import AppException, paginate_list, PaginatedResponse
from app.services.billing_service import generate_invoice, run_billing
from app.services.state_machine import can_cancel_invoice, assert_invoice_transition, InvalidTransitionError

router = APIRouter(prefix="/invoices", tags=["Invoices"])


def _get_invoice_or_404(db: Session, invoice_id: UUID, current_user: User) -> Invoice:
    inv = db.get(Invoice, invoice_id)
    if not inv:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Invoice not found",
        )
    # Customer isolation: customers see only their own records (404 for others)
    if current_user.role == "customer" and inv.customer_id != current_user.id:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Invoice not found",
        )
    return inv


@router.get("", response_model=PaginatedResponse[InvoiceOut])
def list_invoices(
    status_filter: Optional[str] = Query(None, alias="status"),
    customer_id: Optional[UUID] = None,
    subscription_id: Optional[UUID] = None,
    overdue: Optional[bool] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort: str = "-created_at",
    current_user: User = Depends(require_roles("admin", "staff", "customer")),
    db: Session = Depends(get_db),
):
    q = db.query(Invoice)

    # Customer isolation
    if current_user.role == "customer":
        q = q.filter(Invoice.customer_id == current_user.id)
    elif customer_id is not None:
        q = q.filter(Invoice.customer_id == customer_id)

    if status_filter is not None:
        q = q.filter(Invoice.status == status_filter)

    if subscription_id is not None:
        q = q.filter(Invoice.subscription_id == subscription_id)

    if overdue is True:
        today = date.today()
        q = q.filter(
            Invoice.due_date < today,
            Invoice.status.in_(["confirmed", "partially_paid"]),
        )

    if from_date is not None:
        q = q.filter(Invoice.issue_date >= from_date)

    if to_date is not None:
        q = q.filter(Invoice.issue_date <= to_date)

    if search:
        like = f"%{search}%"
        q = q.filter(Invoice.invoice_number.ilike(like))

    sort_field = sort.lstrip("-")
    col = getattr(Invoice, sort_field, Invoice.created_at)
    if sort.startswith("-"):
        q = q.order_by(desc(col))
    else:
        q = q.order_by(asc(col))

    total = q.count()
    items_db = q.offset((page - 1) * page_size).limit(page_size).all()

    # payments is omitted/None on list responses
    items = []
    for inv in items_db:
        dto = InvoiceOut.model_validate(inv)
        dto.payments = None
        items.append(dto)

    return paginate_list(items, total, page, page_size)


@router.post("/generate", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
def generate_single_invoice(
    body: GenerateBody,
    current_user: User = Depends(require_roles("admin", "staff")),
    db: Session = Depends(get_db),
):
    inv = generate_invoice(db, body.subscription_id)
    dto = InvoiceOut.model_validate(inv)
    dto.payments = None
    return dto


@router.post("/run-billing", response_model=RunBillingResult)
def run_bulk_billing(
    body: Optional[RunBillingBody] = None,
    current_user: User = Depends(require_roles("admin", "staff")),
    db: Session = Depends(get_db),
):
    as_of = body.as_of_date if body else None
    result = run_billing(db, as_of_date=as_of)
    return RunBillingResult.model_validate(result)


@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice(
    invoice_id: UUID,
    current_user: User = Depends(require_roles("admin", "staff", "customer")),
    db: Session = Depends(get_db),
):
    inv = _get_invoice_or_404(db, invoice_id, current_user)
    return InvoiceOut.model_validate(inv)


@router.post("/{invoice_id}/confirm", response_model=InvoiceOut)
def confirm_invoice(
    invoice_id: UUID,
    current_user: User = Depends(require_roles("admin", "staff")),
    db: Session = Depends(get_db),
):
    inv = _get_invoice_or_404(db, invoice_id, current_user)
    try:
        assert_invoice_transition(inv.status, "confirmed")
    except InvalidTransitionError as e:
        raise AppException(
            status_code=status.HTTP_409_CONFLICT,
            code="INVALID_TRANSITION",
            message=str(e),
        )

    inv.status = "confirmed"
    inv.confirmed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(inv)
    return InvoiceOut.model_validate(inv)


@router.post("/{invoice_id}/cancel", response_model=InvoiceOut)
def cancel_invoice(
    invoice_id: UUID,
    current_user: User = Depends(require_roles("admin", "staff")),
    db: Session = Depends(get_db),
):
    inv = _get_invoice_or_404(db, invoice_id, current_user)
    if not can_cancel_invoice(inv.status, len(inv.payments)):
        raise AppException(
            status_code=status.HTTP_409_CONFLICT,
            code="INVALID_TRANSITION",
            message=f"Invoice in '{inv.status}' status with {len(inv.payments)} payments cannot be cancelled",
        )

    inv.status = "cancelled"
    inv.cancelled_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(inv)
    return InvoiceOut.model_validate(inv)
