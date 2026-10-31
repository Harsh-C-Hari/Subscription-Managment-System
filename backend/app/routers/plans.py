import uuid
import math
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from app.core.deps import get_db, get_current_user, require_roles
from app.models.plan import Plan
from app.models.product import Product
from app.models.user import User
from app.schemas.common import AppException, PaginatedResponse
from app.schemas.plan import PlanCreate, PlanUpdate, PlanResponse

router = APIRouter(prefix="/plans", tags=["Plans"])


@router.get("", response_model=PaginatedResponse[PlanResponse])
def list_plans(
    search: Optional[str] = None,
    billing_period: Optional[str] = None,
    is_active: Optional[bool] = None,
    product_id: Optional[uuid.UUID] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort: str = "-created_at",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Plan)

    # Customers may only see active plans
    if current_user.role == "customer":
        query = query.filter(Plan.is_active.is_(True))
    elif is_active is not None:
        query = query.filter(Plan.is_active == is_active)

    if billing_period:
        query = query.filter(Plan.billing_period == billing_period)

    if product_id:
        query = query.filter(Plan.product_id == product_id)

    if search:
        query = query.filter(Plan.name.ilike(f"%{search}%"))

    # Sorting
    sort_field = sort.lstrip("-")
    column = getattr(Plan, sort_field, Plan.created_at)
    if sort.startswith("-"):
        query = query.order_by(desc(column))
    else:
        query = query.order_by(asc(column))

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    pages = math.ceil(total / page_size) if total > 0 else 0

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }


@router.post("", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
def create_plan(
    payload: PlanCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles("admin")),
):
    existing = db.query(Plan).filter(Plan.name == payload.name).first()
    if existing:
        raise AppException(
            status_code=status.HTTP_409_CONFLICT,
            code="CONFLICT",
            message=f"Plan with name '{payload.name}' already exists",
        )

    if payload.product_id:
        product = db.query(Product).filter(Product.id == payload.product_id).first()
        if not product:
            raise AppException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                code="VALIDATION_ERROR",
                message=f"Product with id '{payload.product_id}' not found",
            )

    plan = Plan(
        name=payload.name,
        description=payload.description,
        billing_period=payload.billing_period,
        price=payload.price,
        duration_periods=payload.duration_periods,
        auto_close=payload.auto_close,
        product_id=payload.product_id,
        is_active=True,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.get("/{id}", response_model=PlanResponse)
def get_plan(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = db.query(Plan).filter(Plan.id == id).first()
    if not plan:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Plan not found",
        )

    if current_user.role == "customer" and not plan.is_active:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Plan not found",
        )

    return plan


@router.put("/{id}", response_model=PlanResponse)
def update_plan(
    id: uuid.UUID,
    payload: PlanUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles("admin")),
):
    plan = db.query(Plan).filter(Plan.id == id).first()
    if not plan:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Plan not found",
        )

    if payload.name and payload.name != plan.name:
        existing = db.query(Plan).filter(Plan.name == payload.name).first()
        if existing:
            raise AppException(
                status_code=status.HTTP_409_CONFLICT,
                code="CONFLICT",
                message=f"Plan with name '{payload.name}' already exists",
            )
        plan.name = payload.name

    if payload.product_id is not None:
        product = db.query(Product).filter(Product.id == payload.product_id).first()
        if not product:
            raise AppException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                code="VALIDATION_ERROR",
                message=f"Product with id '{payload.product_id}' not found",
            )
        plan.product_id = payload.product_id

    if payload.description is not None:
        plan.description = payload.description
    if payload.billing_period is not None:
        plan.billing_period = payload.billing_period
    if payload.price is not None:
        plan.price = payload.price
    if payload.duration_periods is not None:
        plan.duration_periods = payload.duration_periods
    if payload.auto_close is not None:
        plan.auto_close = payload.auto_close
    if payload.is_active is not None:
        plan.is_active = payload.is_active

    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles("admin")),
):
    plan = db.query(Plan).filter(Plan.id == id).first()
    if not plan:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Plan not found",
        )

    plan.is_active = False
    db.commit()
    return None
