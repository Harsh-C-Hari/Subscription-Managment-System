"""
services/state_machine.py — Subscription and invoice state-transition guards.

PROJECT_SPEC §8.6:
  Subscription:
    draft -> quotation -> confirmed -> active -> closed
    draft -> confirmed  (quotation optional)
    active <-> paused
    any non-closed -> closed

  Invoice:
    draft -> confirmed -> partially_paid -> paid
    draft | confirmed -> cancelled  (only if no payments)
    paid / partially_paid / cancelled -> cannot cancel

Raises InvalidTransitionError (409-safe) on bad moves.
No DB calls in this module.
"""

from typing import Set


class InvalidTransitionError(Exception):
    """Raised when a requested state transition is not permitted."""

    def __init__(self, from_status: str, to_status: str, entity: str = "entity"):
        self.from_status = from_status
        self.to_status = to_status
        self.entity = entity
        super().__init__(
            f"Cannot transition {entity} from '{from_status}' to '{to_status}'"
        )


# ---------------------------------------------------------------------------
# Subscription transitions
# ---------------------------------------------------------------------------

# Maps current status -> set of valid next statuses
SUBSCRIPTION_TRANSITIONS: dict[str, Set[str]] = {
    "draft":     {"quotation", "confirmed", "closed"},
    "quotation": {"confirmed", "closed"},
    "confirmed": {"active", "closed"},
    "active":    {"paused", "closed"},
    "paused":    {"active", "closed"},
    "closed":    set(),   # terminal
}

# 'renew' is NOT a transition on the existing subscription;
# it creates a brand-new draft subscription (handled in subscription_service).


def assert_subscription_transition(from_status: str, to_status: str) -> None:
    """
    Assert that transitioning a subscription from `from_status` to `to_status`
    is valid. Raises InvalidTransitionError otherwise.
    """
    allowed: Set[str] = SUBSCRIPTION_TRANSITIONS.get(from_status, set())
    if to_status not in allowed:
        raise InvalidTransitionError(from_status, to_status, entity="subscription")


def subscription_can_be_edited(status: str) -> bool:
    """Only draft and quotation subscriptions can be edited (PUT)."""
    return status in {"draft", "quotation"}


# ---------------------------------------------------------------------------
# Invoice transitions
# ---------------------------------------------------------------------------

INVOICE_TRANSITIONS: dict[str, Set[str]] = {
    "draft":          {"confirmed", "cancelled"},
    "confirmed":      {"partially_paid", "cancelled"},
    "partially_paid": {"paid"},
    "paid":           set(),       # terminal
    "cancelled":      set(),       # terminal
}


def assert_invoice_transition(from_status: str, to_status: str) -> None:
    """
    Assert that transitioning an invoice from `from_status` to `to_status`
    is valid. Raises InvalidTransitionError otherwise.
    """
    allowed: Set[str] = INVOICE_TRANSITIONS.get(from_status, set())
    if to_status not in allowed:
        raise InvalidTransitionError(from_status, to_status, entity="invoice")


def can_cancel_invoice(status: str, payment_count: int) -> bool:
    """
    An invoice can be cancelled only if:
      - It is in 'draft' or 'confirmed' status, AND
      - It has no recorded payments.
    (Spec §8.6: "Paid or payment-bearing invoices cannot be cancelled.")
    """
    if status not in {"draft", "confirmed"}:
        return False
    if payment_count > 0:
        return False
    return True


def invoice_accepts_payment(status: str) -> bool:
    """Invoice must be confirmed or partially_paid to accept a payment (spec §8.3)."""
    return status in {"confirmed", "partially_paid"}
