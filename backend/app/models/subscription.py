import uuid
from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import (
    String,
    Text,
    SmallInteger,
    Date,
    ForeignKey,
    CheckConstraint,
    Index,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import DateTime
from app.db.base import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    subscription_number: Mapped[str] = mapped_column(
        String(30), unique=True, nullable=False
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("plans.id", ondelete="RESTRICT"),
        nullable=False,
    )
    template_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("quotation_templates.id", ondelete="SET NULL"),
        nullable=True,
    )
    tax_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("taxes.id", ondelete="SET NULL"),
        nullable=True,
    )
    discount_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("discounts.id", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(15), nullable=False, default="draft"
    )
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    next_billing_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    billing_anchor_day: Mapped[Optional[int]] = mapped_column(
        SmallInteger, nullable=True
    )
    quotation_sent_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    activated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    closed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
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

    items: Mapped[List["SubscriptionItem"]] = relationship(
        "SubscriptionItem", back_populates="subscription", cascade="all, delete-orphan"
    )
    customer: Mapped["User"] = relationship("User", foreign_keys=[customer_id])
    plan: Mapped["Plan"] = relationship("Plan", foreign_keys=[plan_id])
    tax: Mapped[Optional["Tax"]] = relationship("Tax", foreign_keys=[tax_id])
    discount: Mapped[Optional["Discount"]] = relationship("Discount", foreign_keys=[discount_id])
    template: Mapped[Optional["QuotationTemplate"]] = relationship("QuotationTemplate", foreign_keys=[template_id])

    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'quotation', 'confirmed', 'active', 'paused', 'closed')",
            name="ck_subscriptions_status",
        ),
        CheckConstraint(
            "billing_anchor_day IS NULL OR (billing_anchor_day >= 1 AND billing_anchor_day <= 31)",
            name="ck_subscriptions_billing_anchor_day",
        ),
        CheckConstraint(
            "status <> 'active' OR (start_date IS NOT NULL AND next_billing_date IS NOT NULL)",
            name="ck_subscriptions_active_dates",
        ),
        Index("ix_sub_customer_id", "customer_id"),
        Index("ix_sub_status", "status"),
        Index("ix_sub_billing_due", "status", "next_billing_date"),
        Index("ix_sub_plan_id", "plan_id"),
    )
