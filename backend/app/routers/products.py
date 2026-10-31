import uuid
import math
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from app.core.deps import get_db, get_current_user, require_roles
from app.models.product import Product
from app.models.product_variant import ProductVariant
from app.models.user import User
from app.schemas.common import AppException, PaginatedResponse
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductListItem,
    ProductDetailResponse,
)
from app.schemas.variant import VariantResponse

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=PaginatedResponse[ProductListItem])
def list_products(
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort: str = "-created_at",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Product)

    # Customers may only see active products
    if current_user.role == "customer":
        query = query.filter(Product.is_active.is_(True))
    elif is_active is not None:
        query = query.filter(Product.is_active == is_active)

    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))

    # Sorting
    sort_field = sort.lstrip("-")
    column = getattr(Product, sort_field, Product.created_at)
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


@router.post("", response_model=ProductListItem, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles("admin")),
):
    existing = db.query(Product).filter(Product.name == payload.name).first()
    if existing:
        raise AppException(
            status_code=status.HTTP_409_CONFLICT,
            code="CONFLICT",
            message=f"Product with name '{payload.name}' already exists",
        )

    product = Product(
        name=payload.name,
        description=payload.description,
        base_price=payload.base_price,
        is_active=True,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/{id}", response_model=ProductDetailResponse)
def get_product(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == id).first()
    if not product:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Product not found",
        )

    if current_user.role == "customer" and not product.is_active:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Product not found",
        )

    # Compute effective_price for variants
    variant_responses = []
    variants_query = db.query(ProductVariant).filter(ProductVariant.product_id == product.id)
    if current_user.role == "customer":
        variants_query = variants_query.filter(ProductVariant.is_active.is_(True))

    for v in variants_query.all():
        effective = product.base_price + v.price_adjustment
        variant_responses.append(
            VariantResponse(
                id=v.id,
                product_id=v.product_id,
                name=v.name,
                sku=v.sku,
                price_adjustment=v.price_adjustment,
                effective_price=effective,
                is_active=v.is_active,
            )
        )

    return ProductDetailResponse(
        id=product.id,
        name=product.name,
        description=product.description,
        base_price=product.base_price,
        is_active=product.is_active,
        created_at=product.created_at,
        variants=variant_responses,
    )


@router.put("/{id}", response_model=ProductListItem)
def update_product(
    id: uuid.UUID,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles("admin")),
):
    product = db.query(Product).filter(Product.id == id).first()
    if not product:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Product not found",
        )

    if payload.name and payload.name != product.name:
        existing = db.query(Product).filter(Product.name == payload.name).first()
        if existing:
            raise AppException(
                status_code=status.HTTP_409_CONFLICT,
                code="CONFLICT",
                message=f"Product with name '{payload.name}' already exists",
            )
        product.name = payload.name

    if payload.description is not None:
        product.description = payload.description
    if payload.base_price is not None:
        product.base_price = payload.base_price
    if payload.is_active is not None:
        product.is_active = payload.is_active

    db.commit()
    db.refresh(product)
    return product


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles("admin")),
):
    product = db.query(Product).filter(Product.id == id).first()
    if not product:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Product not found",
        )

    product.is_active = False
    db.commit()
    return None
