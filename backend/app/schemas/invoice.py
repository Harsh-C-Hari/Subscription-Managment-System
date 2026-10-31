"""schemas/invoice.py — Pydantic schemas for Invoice (API_CONTRACT §11)."""
from decimal import Decimal
from datetime import date, datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.schemas.common import Decimal2Str


class InvoiceItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    product_id: Optional[UUID] = None
    variant_id: Optional[UUID] = None
    description: str
    quantity: int
    unit_price: Decimal2Str
    line_total: Decimal2Str


class PaymentMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    amount: Decimal2Str
    method: str
    reference: Optional[str] = None
    paid_at: datetime


class CustomerMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    full_name: str
    email: str


class InvoiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    invoice_number: str
    status: str
    subscription_id: UUID
    subscription_number: Optional[str] = None  # joined from subscription
    customer: Optional[CustomerMini] = None
    period_start: date
    period_end: date
    issue_date: date
    due_date: date
    items: List[InvoiceItemOut] = []
    subtotal: Decimal2Str
    discount_amount: Decimal2Str
    tax_rate: Decimal2Str
    tax_amount: Decimal2Str
    total: Decimal2Str
    amount_paid: Decimal2Str
    outstanding: Optional[Decimal2Str] = None   # computed
    is_overdue: Optional[bool] = None           # computed
    payments: Optional[List[PaymentMini]] = None  # only on GET by id


class GenerateBody(BaseModel):
    subscription_id: UUID


class RunBillingBody(BaseModel):
    as_of_date: Optional[date] = None


class RunBillingInvoiceRef(BaseModel):
    subscription_id: UUID
    invoice_id: UUID
    invoice_number: str


class RunBillingError(BaseModel):
    subscription_id: UUID
    error: str


class RunBillingResult(BaseModel):
    as_of_date: date
    created: int
    skipped_duplicate: int
    skipped_not_due: int
    failed: int
    invoices: List[RunBillingInvoiceRef] = []
    errors: List[RunBillingError] = []
