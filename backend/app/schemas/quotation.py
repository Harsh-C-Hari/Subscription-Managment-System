"""schemas/quotation.py — Pydantic schemas for QuotationTemplate (API_CONTRACT §9)."""
from decimal import Decimal
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.common import Decimal2Str


class QuotationTemplateItemIn(BaseModel):
    product_id: UUID
    variant_id: Optional[UUID] = None
    description: Optional[str] = None
    quantity: int
    unit_price: Decimal2Str


class QuotationTemplateItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    product_id: UUID
    variant_id: Optional[UUID] = None
    description: Optional[str] = None
    quantity: int
    unit_price: Decimal2Str


class QuotationTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    plan_id: Optional[UUID] = None
    validity_days: int = 30
    items: List[QuotationTemplateItemIn] = []


class QuotationTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    plan_id: Optional[UUID] = None
    validity_days: Optional[int] = None
    is_active: Optional[bool] = None
    items: Optional[List[QuotationTemplateItemIn]] = None


class QuotationTemplateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    description: Optional[str] = None
    plan_id: Optional[UUID] = None
    validity_days: int
    is_active: bool
    items: List[QuotationTemplateItemOut] = []
    created_at: datetime
