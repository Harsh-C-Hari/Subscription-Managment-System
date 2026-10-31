"""routers/billing/taxes.py — Tax CRUD (API_CONTRACT §7)."""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from sqlalchemy import desc, asc
from app.core.deps import get_db, require_roles
from app.models.tax import Tax
from app.models.user import User
from app.schemas.tax import TaxCreate, TaxUpdate, TaxOut
from app.schemas.common import AppException, paginate_list, PaginatedResponse

router = APIRouter(prefix="/taxes", tags=["Taxes"])


def _get_tax_or_404(db: Session, tax_id: UUID) -> Tax:
    tax = db.get(Tax, tax_id)
    if not tax:
        raise AppException(status_code=404, code="NOT_FOUND", message="Tax not found")
    return tax


@router.get("", response_model=PaginatedResponse[TaxOut])
def list_taxes(
    is_active: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort: str = "-created_at",
    current_user: User = Depends(require_roles("admin", "staff")),
    db: Session = Depends(get_db),
):
    q = db.query(Tax)
    if is_active is not None:
        q = q.filter(Tax.is_active == is_active)

    sort_field = sort.lstrip("-")
    col = getattr(Tax, sort_field, Tax.created_at)
    if sort.startswith("-"):
        q = q.order_by(desc(col))
    else:
        q = q.order_by(asc(col))

    total = q.count()
    taxes = q.offset((page - 1) * page_size).limit(page_size).all()
    return paginate_list([TaxOut.model_validate(t) for t in taxes], total, page, page_size)


@router.post("", response_model=TaxOut, status_code=status.HTTP_201_CREATED)
def create_tax(
    body: TaxCreate,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    existing = db.query(Tax).filter(Tax.name == body.name).first()
    if existing:
        raise AppException(status_code=409, code="CONFLICT", message="Tax name already exists")
    tax = Tax(name=body.name, rate=body.rate)
    db.add(tax)
    db.commit()
    db.refresh(tax)
    return TaxOut.model_validate(tax)


@router.put("/{tax_id}", response_model=TaxOut)
def update_tax(
    tax_id: UUID,
    body: TaxUpdate,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    tax = _get_tax_or_404(db, tax_id)
    if body.name is not None and body.name != tax.name:
        existing = db.query(Tax).filter(Tax.name == body.name, Tax.id != tax_id).first()
        if existing:
            raise AppException(status_code=409, code="CONFLICT", message="Tax name already exists")
        tax.name = body.name
    if body.rate is not None:
        tax.rate = body.rate
    if body.is_active is not None:
        tax.is_active = body.is_active
    db.commit()
    db.refresh(tax)
    return TaxOut.model_validate(tax)



@router.delete("/{tax_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tax(
    tax_id: UUID,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    tax = _get_tax_or_404(db, tax_id)
    tax.is_active = False
    db.commit()
