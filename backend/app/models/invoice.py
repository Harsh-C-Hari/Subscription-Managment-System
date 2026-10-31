import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import (
    String,
    Date,
    Numeric,
    ForeignKey,
    CheckConstraint,
    Index,
    text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import DateTime
from app.db.base import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    invoice_number: Mapped[str] = mapped_column(
        String(30), unique=True, nullable=False
    )
    subscription_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subscriptions.id", ondelete="RESTRICT"),
        nullable=False,
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(15), nullable=False, default="draft"
    )
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    issue_date: Mapped[date] = mapped_column(
        Date, nullable=False, server_default=func.current_date()
    )
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    discount_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("discounts.id", ondelete="SET NULL"),
        nullable=True,
    )
    discount_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    tax_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("taxes.id", ondelete="SET NULL"),
        nullable=True,
    )
    tax_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, default=Decimal("0.00")
    )
    tax_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    total: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    amount_paid: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    paid_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    items: Mapped[List["InvoiceItem"]] = relationship(
        "InvoiceItem", back_populates="invoice", cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'confirmed', 'partially_paid', 'paid', 'cancelled')",
            name="ck_invoices_status",
        ),
        CheckConstraint("period_end >= period_start", name="ck_invoices_period_dates"),
        CheckConstraint("due_date >= issue_date", name="ck_invoices_due_date"),
        CheckConstraint("subtotal >= 0", name="ck_invoices_subtotal_positive"),
        CheckConstraint("discount_amount >= 0", name="ck_invoices_discount_amount_positive"),
        CheckConstraint("total >= 0", name="ck_invoices_total_positive"),
        CheckConstraint(
            "amount_paid >= 0 AND amount_paid <= total",
            name="ck_invoices_amount_paid_valid",
        ),
        CheckConstraint(
            "subtotal - discount_amount + tax_amount = total",
            name="ck_invoices_total_math",
        ),
        Index("ix_inv_customer_id", "customer_id"),
        Index("ix_inv_status", "status"),
        Index("ix_inv_due_date", "due_date"),
        Index("ix_inv_subscription_id", "subscription_id"),
        Index(
            "uq_invoice_sub_period",
            "subscription_id",
            "period_start",
            unique=True,
            postgresql_where=text("status <> 'cancelled'"),
        ),
    )
