"""routers/billing/quotations.py — Quotation Templates CRUD (API_CONTRACT §9)."""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc

from app.core.deps import get_db, require_roles
from app.models.quotation_template import QuotationTemplate
from app.models.quotation_template_item import QuotationTemplateItem
from app.models.product import Product
from app.models.product_variant import ProductVariant
from app.models.plan import Plan
from app.models.user import User
from app.schemas.quotation import (
    QuotationTemplateCreate,
    QuotationTemplateUpdate,
    QuotationTemplateOut,
)
from app.schemas.common import AppException, paginate_list, PaginatedResponse

router = APIRouter(prefix="/quotation-templates", tags=["Quotation Templates"])


def _get_or_404(db: Session, template_id: UUID) -> QuotationTemplate:
    tpl = db.get(QuotationTemplate, template_id)
    if not tpl:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Quotation template not found",
        )
    return tpl


@router.get("", response_model=PaginatedResponse[QuotationTemplateOut])
def list_quotation_templates(
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort: str = "-created_at",
    current_user: User = Depends(require_roles("admin", "staff")),
    db: Session = Depends(get_db),
):
    q = db.query(QuotationTemplate)
    if is_active is not None:
        q = q.filter(QuotationTemplate.is_active == is_active)
    if search:
        like = f"%{search}%"
        q = q.filter(QuotationTemplate.name.ilike(like))

    sort_field = sort.lstrip("-")
    col = getattr(QuotationTemplate, sort_field, QuotationTemplate.created_at)
    if sort.startswith("-"):
        q = q.order_by(desc(col))
    else:
        q = q.order_by(asc(col))

    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return paginate_list(
        [QuotationTemplateOut.model_validate(t) for t in items],
        total,
        page,
        page_size,
    )


@router.post("", response_model=QuotationTemplateOut, status_code=status.HTTP_201_CREATED)
def create_quotation_template(
    body: QuotationTemplateCreate,
    current_user: User = Depends(require_roles("admin", "staff")),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(QuotationTemplate)
        .filter(QuotationTemplate.name == body.name)
        .first()
    )
    if existing:
        raise AppException(
            status_code=status.HTTP_409_CONFLICT,
            code="CONFLICT",
            message="Quotation template name already exists",
        )

    if body.plan_id:
        plan = db.get(Plan, body.plan_id)
        if not plan:
            raise AppException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                code="VALIDATION_ERROR",
                message=f"Plan {body.plan_id} not found",
            )

    tpl = QuotationTemplate(
        name=body.name,
        description=body.description,
        plan_id=body.plan_id,
        validity_days=body.validity_days,
        created_by=current_user.id,
    )
    db.add(tpl)
    db.flush()

    for it in body.items:
        prod = db.get(Product, it.product_id)
        if not prod:
            raise AppException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                code="VALIDATION_ERROR",
                message=f"Product {it.product_id} not found",
            )
        desc_text = it.description or prod.name
        if it.variant_id:
            var = db.get(ProductVariant, it.variant_id)
            if not var or var.product_id != it.product_id:
                raise AppException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    code="VALIDATION_ERROR",
                    message=f"Variant {it.variant_id} does not belong to product {it.product_id}",
                )
            if not it.description:
                desc_text = f"{prod.name} – {var.name}"

        db.add(
            QuotationTemplateItem(
                template_id=tpl.id,
                product_id=it.product_id,
                variant_id=it.variant_id,
                description=desc_text,
                quantity=it.quantity,
                unit_price=it.unit_price,
            )
        )

    db.commit()
    db.refresh(tpl)
    return QuotationTemplateOut.model_validate(tpl)


@router.get("/{template_id}", response_model=QuotationTemplateOut)
def get_quotation_template(
    template_id: UUID,
    current_user: User = Depends(require_roles("admin", "staff")),
    db: Session = Depends(get_db),
):
    tpl = _get_or_404(db, template_id)
    return QuotationTemplateOut.model_validate(tpl)


@router.put("/{template_id}", response_model=QuotationTemplateOut)
def update_quotation_template(
    template_id: UUID,
    body: QuotationTemplateUpdate,
    current_user: User = Depends(require_roles("admin", "staff")),
    db: Session = Depends(get_db),
):
    tpl = _get_or_404(db, template_id)

    if body.name is not None and body.name != tpl.name:
        existing = (
            db.query(QuotationTemplate)
            .filter(
                QuotationTemplate.name == body.name,
                QuotationTemplate.id != template_id,
            )
            .first()
        )
        if existing:
            raise AppException(
                status_code=status.HTTP_409_CONFLICT,
                code="CONFLICT",
                message="Quotation template name already exists",
            )
        tpl.name = body.name

    if body.description is not None:
        tpl.description = body.description
    if body.plan_id is not None:
        tpl.plan_id = body.plan_id
    if body.validity_days is not None:
        tpl.validity_days = body.validity_days
    if body.is_active is not None:
        tpl.is_active = body.is_active

    if body.items is not None:
        # Replace items list
        for old in tpl.items:
            db.delete(old)
        db.flush()

        for it in body.items:
            prod = db.get(Product, it.product_id)
            if not prod:
                raise AppException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    code="VALIDATION_ERROR",
                    message=f"Product {it.product_id} not found",
                )
            desc_text = it.description or prod.name
            if it.variant_id:
                var = db.get(ProductVariant, it.variant_id)
                if not var or var.product_id != it.product_id:
                    raise AppException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        code="VALIDATION_ERROR",
                        message=f"Variant {it.variant_id} does not belong to product {it.product_id}",
                    )
                if not it.description:
                    desc_text = f"{prod.name} – {var.name}"

            db.add(
                QuotationTemplateItem(
                    template_id=tpl.id,
                    product_id=it.product_id,
                    variant_id=it.variant_id,
                    description=desc_text,
                    quantity=it.quantity,
                    unit_price=it.unit_price,
                )
            )

    db.commit()
    db.refresh(tpl)
    return QuotationTemplateOut.model_validate(tpl)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_quotation_template(
    template_id: UUID,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    tpl = _get_or_404(db, template_id)
    tpl.is_active = False
    db.commit()
