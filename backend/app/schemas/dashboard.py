"""schemas/dashboard.py — Pydantic schemas for Dashboard (API_CONTRACT §13)."""
from typing import Dict, List
from pydantic import BaseModel
from app.schemas.common import Decimal2Str


class InvoicesByStatus(BaseModel):
    draft: int = 0
    confirmed: int = 0
    partially_paid: int = 0
    paid: int = 0
    cancelled: int = 0


class SubscriptionsByStatus(BaseModel):
    draft: int = 0
    quotation: int = 0
    confirmed: int = 0
    active: int = 0
    paused: int = 0
    closed: int = 0


class DashboardSummaryOut(BaseModel):
    total_revenue: Decimal2Str
    outstanding_amount: Decimal2Str
    overdue_amount: Decimal2Str
    overdue_invoice_count: int
    active_subscriptions: int
    total_customers: int
    invoices_by_status: InvoicesByStatus
    subscriptions_by_status: SubscriptionsByStatus


class RevenueTrendPoint(BaseModel):
    month: str          # "2026-10"
    revenue: Decimal2Str


class RevenueTrendOut(BaseModel):
    points: List[RevenueTrendPoint]
