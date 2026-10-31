import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user, require_roles
from app.models.product import Product
from app.models.product_variant import ProductVariant
from app.models.user import User
from app.schemas.common import AppException
from app.schemas.variant import VariantCreate, VariantUpdate, VariantResponse

router = APIRouter(tags=["Variants"])


def make_variant_response(variant: ProductVariant, base_price) -> VariantResponse:
    effective = base_price + variant.price_adjustment
    return VariantResponse(
        id=variant.id,
        product_id=variant.product_id,
        name=variant.name,
        sku=variant.sku,
        price_adjustment=variant.price_adjustment,
        effective_price=effective,
        is_active=variant.is_active,
    )


@router.get("/products/{product_id}/variants", response_model=List[VariantResponse])
def list_product_variants(
    product_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == product_id).first()
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

    query = db.query(ProductVariant).filter(ProductVariant.product_id == product_id)
    if current_user.role == "customer":
        query = query.filter(ProductVariant.is_active.is_(True))

    variants = query.order_by(ProductVariant.created_at.asc()).all()
    return [make_variant_response(v, product.base_price) for v in variants]


@router.post(
    "/products/{product_id}/variants",
    response_model=VariantResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_variant(
    product_id: uuid.UUID,
    payload: VariantCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles("admin")),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Product not found",
        )

    # Check unique (product_id, name)
    existing_name = (
        db.query(ProductVariant)
        .filter(
            ProductVariant.product_id == product_id,
            ProductVariant.name == payload.name,
        )
        .first()
    )
    if existing_name:
        raise AppException(
            status_code=status.HTTP_409_CONFLICT,
            code="CONFLICT",
            message=f"Variant with name '{payload.name}' already exists for this product",
        )

    # Check unique sku if provided
    if payload.sku:
        existing_sku = (
            db.query(ProductVariant).filter(ProductVariant.sku == payload.sku).first()
        )
        if existing_sku:
            raise AppException(
                status_code=status.HTTP_409_CONFLICT,
                code="CONFLICT",
                message=f"Variant with SKU '{payload.sku}' already exists",
            )

    variant = ProductVariant(
        product_id=product_id,
        name=payload.name,
        sku=payload.sku,
        price_adjustment=payload.price_adjustment,
        is_active=True,
    )
    db.add(variant)
    db.commit()
    db.refresh(variant)
    return make_variant_response(variant, product.base_price)


@router.put("/variants/{id}", response_model=VariantResponse)
def update_variant(
    id: uuid.UUID,
    payload: VariantUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles("admin")),
):
    variant = db.query(ProductVariant).filter(ProductVariant.id == id).first()
    if not variant:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Variant not found",
        )

    product = db.query(Product).filter(Product.id == variant.product_id).first()

    if payload.name and payload.name != variant.name:
        existing_name = (
            db.query(ProductVariant)
            .filter(
                ProductVariant.product_id == variant.product_id,
                ProductVariant.name == payload.name,
                ProductVariant.id != variant.id,
            )
            .first()
        )
        if existing_name:
            raise AppException(
                status_code=status.HTTP_409_CONFLICT,
                code="CONFLICT",
                message=f"Variant with name '{payload.name}' already exists for this product",
            )
        variant.name = payload.name

    if payload.sku and payload.sku != variant.sku:
        existing_sku = (
            db.query(ProductVariant)
            .filter(
                ProductVariant.sku == payload.sku,
                ProductVariant.id != variant.id,
            )
            .first()
        )
        if existing_sku:
            raise AppException(
                status_code=status.HTTP_409_CONFLICT,
                code="CONFLICT",
                message=f"Variant with SKU '{payload.sku}' already exists",
            )
        variant.sku = payload.sku

    if payload.price_adjustment is not None:
        variant.price_adjustment = payload.price_adjustment
    if payload.is_active is not None:
        variant.is_active = payload.is_active

    db.commit()
    db.refresh(variant)
    return make_variant_response(variant, product.base_price)


@router.delete("/variants/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_variant(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles("admin")),
):
    variant = db.query(ProductVariant).filter(ProductVariant.id == id).first()
    if not variant:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Variant not found",
        )

    variant.is_active = False
    db.commit()
    return None
