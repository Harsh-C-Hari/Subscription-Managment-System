"""
tests/test_billing_state_machine.py

Unit tests for services/state_machine.py — subscription and invoice
state-transition guards. Pure Python, no DB.
"""

import pytest

from app.services.state_machine import (
    InvalidTransitionError,
    assert_subscription_transition,
    assert_invoice_transition,
    can_cancel_invoice,
    invoice_accepts_payment,
    subscription_can_be_edited,
)


# ---------------------------------------------------------------------------
# Subscription transitions
# ---------------------------------------------------------------------------

class TestSubscriptionTransitions:
    # --- valid paths ---

    def test_draft_to_quotation(self):
        assert_subscription_transition("draft", "quotation")  # must not raise

    def test_draft_to_confirmed(self):
        assert_subscription_transition("draft", "confirmed")

    def test_draft_to_closed(self):
        assert_subscription_transition("draft", "closed")

    def test_quotation_to_confirmed(self):
        assert_subscription_transition("quotation", "confirmed")

    def test_confirmed_to_active(self):
        assert_subscription_transition("confirmed", "active")

    def test_active_to_paused(self):
        assert_subscription_transition("active", "paused")

    def test_paused_to_active(self):
        assert_subscription_transition("paused", "active")

    def test_active_to_closed(self):
        assert_subscription_transition("active", "closed")

    def test_paused_to_closed(self):
        assert_subscription_transition("paused", "closed")

    def test_confirmed_to_closed(self):
        assert_subscription_transition("confirmed", "closed")

    # --- invalid paths ---

    def test_draft_to_active_raises(self):
        """Cannot skip confirmed step."""
        with pytest.raises(InvalidTransitionError):
            assert_subscription_transition("draft", "active")

    def test_draft_to_paused_raises(self):
        with pytest.raises(InvalidTransitionError):
            assert_subscription_transition("draft", "paused")

    def test_active_to_draft_raises(self):
        """No backward transitions."""
        with pytest.raises(InvalidTransitionError):
            assert_subscription_transition("active", "draft")

    def test_active_to_confirmed_raises(self):
        with pytest.raises(InvalidTransitionError):
            assert_subscription_transition("active", "confirmed")

    def test_closed_to_active_raises(self):
        """closed is terminal."""
        with pytest.raises(InvalidTransitionError):
            assert_subscription_transition("closed", "active")

    def test_closed_to_draft_raises(self):
        with pytest.raises(InvalidTransitionError):
            assert_subscription_transition("closed", "draft")

    def test_paused_to_confirmed_raises(self):
        with pytest.raises(InvalidTransitionError):
            assert_subscription_transition("paused", "confirmed")

    # --- error message ---
    def test_error_message_content(self):
        with pytest.raises(InvalidTransitionError) as exc_info:
            assert_subscription_transition("draft", "paid")
        err = exc_info.value
        assert err.from_status == "draft"
        assert err.to_status == "paid"
        assert "subscription" in str(err)


class TestSubscriptionEditability:
    def test_draft_editable(self):
        assert subscription_can_be_edited("draft") is True

    def test_quotation_editable(self):
        assert subscription_can_be_edited("quotation") is True

    def test_confirmed_not_editable(self):
        assert subscription_can_be_edited("confirmed") is False

    def test_active_not_editable(self):
        assert subscription_can_be_edited("active") is False

    def test_closed_not_editable(self):
        assert subscription_can_be_edited("closed") is False


# ---------------------------------------------------------------------------
# Invoice transitions
# ---------------------------------------------------------------------------

class TestInvoiceTransitions:
    # --- valid paths ---

    def test_draft_to_confirmed(self):
        assert_invoice_transition("draft", "confirmed")

    def test_draft_to_cancelled(self):
        assert_invoice_transition("draft", "cancelled")

    def test_confirmed_to_partially_paid(self):
        assert_invoice_transition("confirmed", "partially_paid")

    def test_confirmed_to_cancelled(self):
        assert_invoice_transition("confirmed", "cancelled")

    def test_partially_paid_to_paid(self):
        assert_invoice_transition("partially_paid", "paid")

    # --- invalid paths ---

    def test_draft_to_paid_raises(self):
        """Cannot skip directly to paid."""
        with pytest.raises(InvalidTransitionError):
            assert_invoice_transition("draft", "paid")

    def test_paid_to_cancelled_raises(self):
        """paid is terminal."""
        with pytest.raises(InvalidTransitionError):
            assert_invoice_transition("paid", "cancelled")

    def test_cancelled_to_confirmed_raises(self):
        """cancelled is terminal."""
        with pytest.raises(InvalidTransitionError):
            assert_invoice_transition("cancelled", "confirmed")

    def test_partially_paid_to_cancelled_raises(self):
        """Cannot cancel a partially paid invoice via transition."""
        with pytest.raises(InvalidTransitionError):
            assert_invoice_transition("partially_paid", "cancelled")

    def test_paid_to_draft_raises(self):
        with pytest.raises(InvalidTransitionError):
            assert_invoice_transition("paid", "draft")


# ---------------------------------------------------------------------------
# Invoice cancellation guard
# ---------------------------------------------------------------------------

class TestCanCancelInvoice:
    def test_draft_no_payments(self):
        assert can_cancel_invoice("draft", payment_count=0) is True

    def test_confirmed_no_payments(self):
        assert can_cancel_invoice("confirmed", payment_count=0) is True

    def test_draft_with_payments(self):
        """A payment-bearing draft cannot be cancelled."""
        assert can_cancel_invoice("draft", payment_count=1) is False

    def test_confirmed_with_payments(self):
        assert can_cancel_invoice("confirmed", payment_count=2) is False

    def test_partially_paid_no_payments_false(self):
        """partially_paid status itself prevents cancellation."""
        assert can_cancel_invoice("partially_paid", payment_count=0) is False

    def test_paid_no_payments_false(self):
        assert can_cancel_invoice("paid", payment_count=0) is False

    def test_cancelled_no_payments_false(self):
        assert can_cancel_invoice("cancelled", payment_count=0) is False


# ---------------------------------------------------------------------------
# Payment acceptance guard
# ---------------------------------------------------------------------------

class TestInvoiceAcceptsPayment:
    def test_confirmed_accepts(self):
        assert invoice_accepts_payment("confirmed") is True

    def test_partially_paid_accepts(self):
        assert invoice_accepts_payment("partially_paid") is True

    def test_draft_rejects(self):
        assert invoice_accepts_payment("draft") is False

    def test_paid_rejects(self):
        assert invoice_accepts_payment("paid") is False

    def test_cancelled_rejects(self):
        assert invoice_accepts_payment("cancelled") is False
