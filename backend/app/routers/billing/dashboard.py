"""routers/billing/dashboard.py — Dashboard metrics and revenue trend (API_CONTRACT §13)."""
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Dict
from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.deps import get_db, require_roles
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.dashboard import (
    DashboardSummaryOut,
    InvoicesByStatus,
    SubscriptionsByStatus,
    RevenueTrendPoint,
    RevenueTrendOut,
)
from app.services.money import quantize, ZERO

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummaryOut)
def get_dashboard_summary(
    current_user: User = Depends(require_roles("admin", "staff")),
    db: Session = Depends(get_db),
):
    today = date.today()

    # 1. Total revenue: sum of all payments
    rev_res = db.query(func.coalesce(func.sum(Payment.amount), Decimal("0.00"))).scalar()
    total_revenue = quantize(Decimal(str(rev_res)))

    # 2. Outstanding amount: sum(total - amount_paid) over confirmed | partially_paid invoices
    unpaid_invoices = (
        db.query(Invoice)
        .filter(Invoice.status.in_(["confirmed", "partially_paid"]))
        .all()
    )
    outstanding_amount = quantize(
        sum((inv.total - inv.amount_paid for inv in unpaid_invoices), ZERO)
    )

    # 3. Overdue amount & count: due_date < today over confirmed | partially_paid
    overdue_invoices = [inv for inv in unpaid_invoices if inv.due_date < today]
    overdue_amount = quantize(
        sum((inv.total - inv.amount_paid for inv in overdue_invoices), ZERO)
    )
    overdue_invoice_count = len(overdue_invoices)

    # 4. Active subscriptions
    active_subscriptions = (
        db.query(Subscription)
        .filter(Subscription.status == "active")
        .count()
    )

    # 5. Total customers
    total_customers = (
        db.query(User)
        .filter(User.role == "customer")
        .count()
    )

    # 6. Invoices by status
    inv_counts = (
        db.query(Invoice.status, func.count(Invoice.id))
        .group_by(Invoice.status)
        .all()
    )
    inv_map = {st: cnt for st, cnt in inv_counts}
    invoices_by_status = InvoicesByStatus(
        draft=inv_map.get("draft", 0),
        confirmed=inv_map.get("confirmed", 0),
        partially_paid=inv_map.get("partially_paid", 0),
        paid=inv_map.get("paid", 0),
        cancelled=inv_map.get("cancelled", 0),
    )

    # 7. Subscriptions by status
    sub_counts = (
        db.query(Subscription.status, func.count(Subscription.id))
        .group_by(Subscription.status)
        .all()
    )
    sub_map = {st: cnt for st, cnt in sub_counts}
    subscriptions_by_status = SubscriptionsByStatus(
        draft=sub_map.get("draft", 0),
        quotation=sub_map.get("quotation", 0),
        confirmed=sub_map.get("confirmed", 0),
        active=sub_map.get("active", 0),
        paused=sub_map.get("paused", 0),
        closed=sub_map.get("closed", 0),
    )

    return DashboardSummaryOut(
        total_revenue=total_revenue,
        outstanding_amount=outstanding_amount,
        overdue_amount=overdue_amount,
        overdue_invoice_count=overdue_invoice_count,
        active_subscriptions=active_subscriptions,
        total_customers=total_customers,
        invoices_by_status=invoices_by_status,
        subscriptions_by_status=subscriptions_by_status,
    )


@router.get("/revenue-trend", response_model=RevenueTrendOut)
def get_revenue_trend(
    months: int = Query(default=6, ge=1, le=60),
    current_user: User = Depends(require_roles("admin", "staff")),
    db: Session = Depends(get_db),
):
    today = date.today()

    # Generate list of month strings: oldest first up to current month
    # e.g. for months=3 in Oct 2026: ["2026-08", "2026-09", "2026-10"]
    month_keys: List[str] = []
    for i in range(months - 1, -1, -1):
        d = today - relativedelta(months=i)
        month_keys.append(d.strftime("%Y-%m"))

    # Cutoff date: 1st day of the oldest month
    oldest_date = today - relativedelta(months=months - 1)
    cutoff = datetime(oldest_date.year, oldest_date.month, 1, tzinfo=timezone.utc)

    # Query payments since cutoff
    payments = db.query(Payment).filter(Payment.paid_at >= cutoff).all()

    month_totals: Dict[str, Decimal] = {m: ZERO for m in month_keys}
    for p in payments:
        m_str = p.paid_at.strftime("%Y-%m")
        if m_str in month_totals:
            month_totals[m_str] = quantize(month_totals[m_str] + p.amount)

    points = [
        RevenueTrendPoint(month=m, revenue=quantize(month_totals[m]))
        for m in month_keys
    ]
    return RevenueTrendOut(points=points)
