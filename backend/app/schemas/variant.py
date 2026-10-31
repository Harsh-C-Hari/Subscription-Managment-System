import uuid
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.common import Decimal2Str


class VariantBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    sku: Optional[str] = Field(default=None, max_length=60)
    price_adjustment: Decimal2Str = Decimal("0.00")
    is_active: bool = True


class VariantCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    sku: Optional[str] = Field(default=None, max_length=60)
    price_adjustment: Decimal2Str = Decimal("0.00")


class VariantUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    sku: Optional[str] = Field(default=None, max_length=60)
    price_adjustment: Optional[Decimal2Str] = None
    is_active: Optional[bool] = None


class VariantResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    name: str
    sku: Optional[str] = None
    price_adjustment: Decimal2Str
    effective_price: Decimal2Str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
