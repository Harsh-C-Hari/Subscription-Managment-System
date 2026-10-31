"""schemas/discount.py — Pydantic schemas for Discount (API_CONTRACT §8)."""
from decimal import Decimal
from datetime import date
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, field_validator, ConfigDict
from app.schemas.common import Decimal2Str


class DiscountCreate(BaseModel):
    name: str
    code: str
    type: str
    value: Decimal2Str
    min_amount: Decimal2Str = Decimal("0.00")
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None
    usage_limit: Optional[int] = None

    @field_validator("type")
    @classmethod
    def type_valid(cls, v):
        if v not in ("fixed", "percentage"):
            raise ValueError("type must be 'fixed' or 'percentage'")
        return v

    @field_validator("code")
    @classmethod
    def code_uppercase(cls, v):
        return v.upper()


class DiscountUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    type: Optional[str] = None
    value: Optional[Decimal2Str] = None
    min_amount: Optional[Decimal2Str] = None
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None
    usage_limit: Optional[int] = None
    is_active: Optional[bool] = None

    @field_validator("code")
    @classmethod
    def code_uppercase(cls, v):
        return v.upper() if v else v


class DiscountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    code: str
    type: str
    value: Decimal2Str
    min_amount: Decimal2Str
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None
    usage_limit: Optional[int] = None
    used_count: int
    is_active: bool
