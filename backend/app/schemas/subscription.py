"""schemas/subscription.py — Pydantic schemas for Subscription (API_CONTRACT §10)."""
from decimal import Decimal
from datetime import date, datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.schemas.common import Decimal2Str


class SubscriptionItemIn(BaseModel):
    product_id: UUID
    variant_id: Optional[UUID] = None
    quantity: int
    unit_price: Decimal2Str


class SubscriptionItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    product_id: UUID
    variant_id: Optional[UUID] = None
    description: str
    quantity: int
    unit_price: Decimal2Str
    line_total: Optional[Decimal2Str] = None  # computed on response


class CustomerMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    full_name: str
    email: str


class PlanMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    billing_period: str


class TaxMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    rate: Decimal2Str


class DiscountMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    code: str


class SubscriptionCreate(BaseModel):
    customer_id: UUID
    plan_id: UUID
    template_id: Optional[UUID] = None
    tax_id: Optional[UUID] = None
    discount_id: Optional[UUID] = None
    notes: Optional[str] = None
    items: Optional[List[SubscriptionItemIn]] = None


class SubscriptionUpdate(BaseModel):
    tax_id: Optional[UUID] = None
    discount_id: Optional[UUID] = None
    notes: Optional[str] = None
    items: Optional[List[SubscriptionItemIn]] = None


class ActivateBody(BaseModel):
    start_date: Optional[date] = None


class SubscriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    subscription_number: str
    status: str
    customer: Optional[CustomerMini] = None
    plan: Optional[PlanMini] = None
    tax: Optional[TaxMini] = None
    discount: Optional[DiscountMini] = None
    items: List[SubscriptionItemOut] = []
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    next_billing_date: Optional[date] = None
    billing_anchor_day: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime
