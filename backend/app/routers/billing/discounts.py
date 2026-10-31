"""routers/billing/discounts.py — Discount CRUD (API_CONTRACT §8)."""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_roles
from app.models.discount import Discount
from app.models.user import User
from app.schemas.discount import DiscountCreate, DiscountUpdate, DiscountOut
from app.schemas.common import AppException, paginate_list, PaginatedResponse

router = APIRouter(prefix="/discounts", tags=["Discounts"])


def _get_or_404(db: Session, did: UUID) -> Discount:
    d = db.get(Discount, did)
    if not d:
        raise AppException(status_code=404, code="NOT_FOUND", message="Discount not found")
    return d


@router.get("", response_model=PaginatedResponse[DiscountOut])
def list_discounts(
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles("admin", "staff")),
    db: Session = Depends(get_db),
):
    q = db.query(Discount)
    if is_active is not None:
        q = q.filter(Discount.is_active == is_active)
    if search:
        like = f"%{search}%"
        q = q.filter(Discount.name.ilike(like) | Discount.code.ilike(like))
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return paginate_list([DiscountOut.model_validate(d) for d in items], total, page, page_size)


@router.post("", response_model=DiscountOut, status_code=status.HTTP_201_CREATED)
def create_discount(
    body: DiscountCreate,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    existing = db.query(Discount).filter(Discount.code == body.code.upper()).first()
    if existing:
        raise AppException(status_code=409, code="CONFLICT", message="Discount code already exists")
    d = Discount(
        name=body.name,
        code=body.code.upper(),
        type=body.type,
        value=body.value,
        min_amount=body.min_amount,
        valid_from=body.valid_from,
        valid_until=body.valid_until,
        usage_limit=body.usage_limit,
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return DiscountOut.model_validate(d)


@router.put("/{discount_id}", response_model=DiscountOut)
def update_discount(
    discount_id: UUID,
    body: DiscountUpdate,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    d = _get_or_404(db, discount_id)
    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(d, field, val)
    db.commit()
    db.refresh(d)
    return DiscountOut.model_validate(d)


@router.delete("/{discount_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_discount(
    discount_id: UUID,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    d = _get_or_404(db, discount_id)
    d.is_active = False
    db.commit()
