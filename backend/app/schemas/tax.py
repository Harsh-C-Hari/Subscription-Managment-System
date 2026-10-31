"""schemas/tax.py — Pydantic schemas for Tax (API_CONTRACT §7)."""
from decimal import Decimal
from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, field_validator, ConfigDict
from app.schemas.common import Decimal2Str


class TaxCreate(BaseModel):
    name: str
    rate: Decimal2Str

    @field_validator("rate", mode="before")
    @classmethod
    def rate_must_be_valid(cls, v):
        d = Decimal(str(v))
        if d < 0 or d > 100:
            raise ValueError("rate must be between 0 and 100")
        return d


class TaxUpdate(BaseModel):
    name: Optional[str] = None
    rate: Optional[Decimal2Str] = None
    is_active: Optional[bool] = None


class TaxOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    rate: Decimal2Str
    is_active: bool
