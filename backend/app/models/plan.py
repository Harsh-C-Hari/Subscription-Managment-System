import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import (
    String,
    Text,
    Boolean,
    Numeric,
    Integer,
    ForeignKey,
    CheckConstraint,
    Index,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import DateTime
from app.db.base import Base


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    billing_period: Mapped[str] = mapped_column(String(10), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    duration_periods: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    auto_close: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    product_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    product: Mapped[Optional["Product"]] = relationship("Product")

    __table_args__ = (
        CheckConstraint(
            "billing_period IN ('daily', 'weekly', 'monthly', 'yearly')",
            name="ck_plans_billing_period",
        ),
        CheckConstraint("price >= 0", name="ck_plans_price_positive"),
        CheckConstraint(
            "duration_periods IS NULL OR duration_periods > 0",
            name="ck_plans_duration_periods_positive",
        ),
        Index("ix_plans_product_id", "product_id"),
        Index("ix_plans_is_active", "is_active"),
    )
