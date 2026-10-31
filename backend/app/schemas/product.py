import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict, field_validator
from app.schemas.common import Decimal2Str
from app.schemas.variant import VariantResponse


class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None
    base_price: Decimal2Str
    is_active: bool = True

    @field_validator("base_price")
    @classmethod
    def validate_positive_price(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("base_price cannot be negative")
        return v


class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None
    base_price: Decimal2Str

    @field_validator("base_price")
    @classmethod
    def validate_positive_price(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("base_price cannot be negative")
        return v


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    description: Optional[str] = None
    base_price: Optional[Decimal2Str] = None
    is_active: Optional[bool] = None

    @field_validator("base_price")
    @classmethod
    def validate_positive_price(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v < 0:
            raise ValueError("base_price cannot be negative")
        return v


class ProductListItem(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    base_price: Decimal2Str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductDetailResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    base_price: Decimal2Str
    is_active: bool
    created_at: datetime
    variants: List[VariantResponse] = []

    model_config = ConfigDict(from_attributes=True)
