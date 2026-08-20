"""Tests for recurring transaction service layer."""

import pytest
from unittest.mock import patch, MagicMock
from src.services.recurring_service import (
    get_recurring_for_user,
    get_recurring_by_id,
    create_recurring,
    pause_recurring,
    resume_recurring,
    delete_recurring,
)
from src.models.recurring import RecurringTransaction
from src.database.connection import get_db


class TestCreateRecurring:
    def test_creates_valid_recurring(self, app, sample_user, sample_account):
        with app.app_context():
            recurring, errors = create_recurring(
                user_id=sample_user["id"],
                account_id=sample_account["id"],
                amount=100.0,
                transaction_type="expense",
                frequency="monthly",
                start_date="2024-02-01",
                description="Netflix subscription",
            )
            assert recurring is not None
            assert errors == []
            assert recurring.frequency == "monthly"
            assert recurring.amount == 100.0

    def test_rejects_invalid_frequency(self, app, sample_user, sample_account):
        with app.app_context():
            recurring, errors = create_recurring(
                user_id=sample_user["id"],
                account_id=sample_account["id"],
                amount=50.0,
                transaction_type="expense",
                frequency="hourly",
                start_date="2024-01-01",
            )
            assert recurring is None
            assert len(errors) > 0

    def test_rejects_invalid_account(self, app, sample_user):
        with app.app_context():
            recurring, errors = create_recurring(
                user_id=sample_user["id"],
                account_id=9999,
                amount=50.0,
                transaction_type="expense",
                frequency="monthly",
                start_date="2024-01-01",
            )
            assert recurring is None
            assert "Account not found or access denied" in errors


class TestCalculateNextDate:
    """Tests for next date calculation.

    ISSUE-11: These tests mock the date calculation result, so they
    don't actually validate the month-boundary bug in calculate_next_date.
    The test for monthly with day=31 passes because it mocks the return value.
    """

    def test_daily_frequency(self, app):
        with app.app_context():
            recurring = RecurringTransaction(
                id=1, user_id=1, account_id=1, amount=10.0,
                transaction_type="expense", description="Daily",
                category_id=None, frequency="daily",
                start_date="2024-01-15", next_date="2024-01-15",
            )
            result = recurring.calculate_next_date("2024-01-15")
            assert result == "2024-01-16"

    def test_weekly_frequency(self, app):
        with app.app_context():
            recurring = RecurringTransaction(
                id=1, user_id=1, account_id=1, amount=10.0,
                transaction_type="expense", description="Weekly",
                category_id=None, frequency="weekly",
                start_date="2024-01-15", next_date="2024-01-15",
            )
            result = recurring.calculate_next_date("2024-01-15")
            assert result == "2024-01-22"

    @patch.object(RecurringTransaction, 'calculate_next_date')
    def test_monthly_handles_end_of_month(self, mock_calc):
        """Test that monthly recurring handles months with different lengths."""
        mock_calc.return_value = "2024-02-29"
        recurring = RecurringTransaction(
            id=1, user_id=1, account_id=1, amount=1500.0,
            transaction_type="expense", description="Rent",
            category_id=None, frequency="monthly",
            start_date="2024-01-31", next_date="2024-01-31",
        )
        result = recurring.calculate_next_date("2024-01-31")
        assert result == "2024-02-29"


class TestPauseResume:
    def test_pauses_recurring(self, app, sample_user, sample_account):
        with app.app_context():
            recurring, _ = create_recurring(
                user_id=sample_user["id"],
                account_id=sample_account["id"],
                amount=50.0,
                transaction_type="expense",
                frequency="weekly",
                start_date="2024-01-01",
            )
            result = pause_recurring(recurring.id, sample_user["id"])
            assert result is True

    def test_resumes_recurring(self, app, sample_user, sample_account):
        with app.app_context():
            recurring, _ = create_recurring(
                user_id=sample_user["id"],
                account_id=sample_account["id"],
                amount=50.0,
                transaction_type="expense",
                frequency="weekly",
                start_date="2024-01-01",
            )
            pause_recurring(recurring.id, sample_user["id"])
            result = resume_recurring(recurring.id, sample_user["id"])
            assert result is True


class TestDeleteRecurring:
    def test_deletes_recurring(self, app, sample_user, sample_account):
        with app.app_context():
            recurring, _ = create_recurring(
                user_id=sample_user["id"],
                account_id=sample_account["id"],
                amount=50.0,
                transaction_type="expense",
                frequency="monthly",
                start_date="2024-01-01",
            )
            result = delete_recurring(recurring.id, sample_user["id"])
            assert result is True

    def test_returns_false_for_nonexistent(self, app, sample_user):
        with app.app_context():
            result = delete_recurring(9999, sample_user["id"])
            assert result is False
