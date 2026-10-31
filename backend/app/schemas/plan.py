import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict, field_validator
from app.schemas.common import Decimal2Str

BillingPeriod = Literal["daily", "weekly", "monthly", "yearly"]


class PlanCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None
    billing_period: BillingPeriod
    price: Decimal2Str
    duration_periods: Optional[int] = Field(default=None, gt=0)
    auto_close: bool = True
    product_id: Optional[uuid.UUID] = None

    @field_validator("price")
    @classmethod
    def validate_positive_price(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("price cannot be negative")
        return v


class PlanUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    description: Optional[str] = None
    billing_period: Optional[BillingPeriod] = None
    price: Optional[Decimal2Str] = None
    duration_periods: Optional[int] = Field(default=None, gt=0)
    auto_close: Optional[bool] = None
    product_id: Optional[uuid.UUID] = None
    is_active: Optional[bool] = None

    @field_validator("price")
    @classmethod
    def validate_positive_price(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v < 0:
            raise ValueError("price cannot be negative")
        return v


class PlanResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    billing_period: str
    price: Decimal2Str
    duration_periods: Optional[int] = None
    auto_close: bool
    product_id: Optional[uuid.UUID] = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
