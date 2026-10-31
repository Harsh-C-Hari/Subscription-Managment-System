import uuid
import math
import secrets
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_
from app.core.deps import get_db, get_current_user, require_roles
from app.core.security import get_password_hash
from app.models.user import User
from app.schemas.common import AppException, PaginatedResponse
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get("", response_model=PaginatedResponse[CustomerResponse])
def list_customers(
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort: str = "-created_at",
    db: Session = Depends(get_db),
    _user: User = Depends(require_roles("admin", "staff")),
):
    query = db.query(User).filter(User.role == "customer")

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                User.full_name.ilike(term),
                User.email.ilike(term),
                User.company_name.ilike(term),
            )
        )

    sort_field = sort.lstrip("-")
    column = getattr(User, sort_field, User.created_at)
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


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(require_roles("admin", "staff")),
):
    email_clean = payload.email.lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise AppException(
            status_code=status.HTTP_409_CONFLICT,
            code="CONFLICT",
            message="Email is already registered",
        )

    temp_password = None
    if payload.password:
        password_to_hash = payload.password
    else:
        temp_password = secrets.token_urlsafe(12) + "A1!"
        password_to_hash = temp_password

    user = User(
        email=email_clean,
        password_hash=get_password_hash(password_to_hash),
        full_name=payload.full_name,
        phone=payload.phone,
        company_name=payload.company_name,
        address=payload.address,
        role="customer",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    response_data = CustomerResponse.model_validate(user)
    if temp_password:
        response_data.temporary_password = temp_password
    return response_data


@router.get("/{id}", response_model=CustomerResponse)
def get_customer(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Customer may only access their own record (404 for others)
    if current_user.role == "customer" and current_user.id != id:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Customer not found",
        )

    customer = db.query(User).filter(User.id == id, User.role == "customer").first()
    if not customer:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Customer not found",
        )

    return customer


@router.put("/{id}", response_model=CustomerResponse)
def update_customer(
    id: uuid.UUID,
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Customer may only access their own record (404 for others)
    if current_user.role == "customer" and current_user.id != id:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Customer not found",
        )

    customer = db.query(User).filter(User.id == id, User.role == "customer").first()
    if not customer:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Customer not found",
        )

    if payload.email and payload.email.lower() != customer.email:
        email_clean = payload.email.lower()
        existing = db.query(User).filter(User.email == email_clean, User.id != id).first()
        if existing:
            raise AppException(
                status_code=status.HTTP_409_CONFLICT,
                code="CONFLICT",
                message="Email is already in use",
            )
        customer.email = email_clean

    if payload.full_name is not None:
        customer.full_name = payload.full_name
    if payload.phone is not None:
        customer.phone = payload.phone
    if payload.company_name is not None:
        customer.company_name = payload.company_name
    if payload.address is not None:
        customer.address = payload.address

    # Customers cannot change role or is_active
    if current_user.role != "customer":
        if payload.is_active is not None:
            customer.is_active = payload.is_active

    db.commit()
    db.refresh(customer)
    return customer


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles("admin")),
):
    customer = db.query(User).filter(User.id == id, User.role == "customer").first()
    if not customer:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Customer not found",
        )

    customer.is_active = False
    db.commit()
    return None
