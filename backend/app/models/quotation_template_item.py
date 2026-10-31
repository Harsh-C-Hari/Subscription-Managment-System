import uuid
from decimal import Decimal
from typing import Optional
from sqlalchemy import String, Integer, Numeric, ForeignKey, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class QuotationTemplateItem(Base):
    __tablename__ = "quotation_template_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    template_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("quotation_templates.id", ondelete="CASCADE"),
        nullable=False,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
    )
    variant_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("product_variants.id", ondelete="RESTRICT"),
        nullable=True,
    )
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    template: Mapped["QuotationTemplate"] = relationship(
        "QuotationTemplate", back_populates="items"
    )

    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_qti_quantity_positive"),
        CheckConstraint("unit_price >= 0", name="ck_qti_unit_price_positive"),
        Index("ix_qti_template_id", "template_id"),
    )
