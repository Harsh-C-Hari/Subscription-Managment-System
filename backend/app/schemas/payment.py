"""schemas/payment.py — Pydantic schemas for Payment (API_CONTRACT §12)."""
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.schemas.common import Decimal2Str


class PaymentCreate(BaseModel):
    amount: Decimal2Str
    method: str
    reference: Optional[str] = None
    paid_at: Optional[datetime] = None
    notes: Optional[str] = None


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    invoice_id: UUID
    customer_id: UUID
    amount: Decimal2Str
    method: str
    reference: Optional[str] = None
    paid_at: datetime


class InvoiceStatusMini(BaseModel):
    id: UUID
    status: str
    total: Decimal2Str
    amount_paid: Decimal2Str
    outstanding: Decimal2Str


class PaymentResponse(BaseModel):
    payment: PaymentOut
    invoice: InvoiceStatusMini
