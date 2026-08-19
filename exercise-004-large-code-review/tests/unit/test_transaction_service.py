"""Tests for transaction service layer."""

import pytest
from src.services.transaction_service import (
    get_transactions_for_user,
    get_transaction_by_id,
    create_transaction,
    delete_transaction,
    get_spending_summary,
)
from src.services.account_service import get_account_by_id


class TestCreateTransaction:
    def test_creates_expense_and_updates_balance(self, app, sample_user, sample_account):
        with app.app_context():
            transaction, errors = create_transaction(
                user_id=sample_user["id"],
                account_id=sample_account["id"],
                amount=100.0,
                transaction_type="expense",
                description="Test expense",
                txn_date="2024-01-15",
            )
            assert transaction is not None
            assert errors == []
            assert transaction.amount == 100.0

            # Check balance updated
            account = get_account_by_id(sample_account["id"], sample_user["id"])
            assert account.balance == 900.0

    def test_creates_income_and_updates_balance(self, app, sample_user, sample_account):
        with app.app_context():
            transaction, errors = create_transaction(
                user_id=sample_user["id"],
                account_id=sample_account["id"],
                amount=500.0,
                transaction_type="income",
                description="Salary",
                txn_date="2024-01-15",
            )
            assert transaction is not None
            assert errors == []

            account = get_account_by_id(sample_account["id"], sample_user["id"])
            assert account.balance == 1500.0

    def test_rejects_invalid_account(self, app, sample_user):
        with app.app_context():
            transaction, errors = create_transaction(
                user_id=sample_user["id"],
                account_id=9999,
                amount=50.0,
                transaction_type="expense",
            )
            assert transaction is None
            assert "Account not found or access denied" in errors

    def test_rejects_negative_amount(self, app, sample_user, sample_account):
        with app.app_context():
            transaction, errors = create_transaction(
                user_id=sample_user["id"],
                account_id=sample_account["id"],
                amount=-50.0,
                transaction_type="expense",
            )
            assert transaction is None
            assert len(errors) > 0

    def test_rejects_zero_amount(self, app, sample_user, sample_account):
        with app.app_context():
            transaction, errors = create_transaction(
                user_id=sample_user["id"],
                account_id=sample_account["id"],
                amount=0,
                transaction_type="expense",
            )
            assert transaction is None
            assert len(errors) > 0

    def test_rejects_invalid_type(self, app, sample_user, sample_account):
        with app.app_context():
            transaction, errors = create_transaction(
                user_id=sample_user["id"],
                account_id=sample_account["id"],
                amount=50.0,
                transaction_type="refund",
            )
            assert transaction is None
            assert len(errors) > 0


class TestDeleteTransaction:
    def test_deletes_and_reverses_balance(self, app, sample_user, sample_account, sample_transaction):
        with app.app_context():
            result = delete_transaction(sample_transaction["id"], sample_user["id"])
            assert result is True

            # Balance should be restored
            account = get_account_by_id(sample_account["id"], sample_user["id"])
            assert account.balance == 1000.0

    def test_returns_false_for_nonexistent(self, app, sample_user):
        with app.app_context():
            result = delete_transaction(9999, sample_user["id"])
            assert result is False


class TestGetTransactions:
    def test_returns_user_transactions(self, app, sample_user, sample_transaction):
        with app.app_context():
            transactions = get_transactions_for_user(sample_user["id"])
            assert len(transactions) == 1
            assert transactions[0].amount == 50.0

    def test_filters_by_account(self, app, sample_user, sample_account, sample_transaction):
        with app.app_context():
            transactions = get_transactions_for_user(
                sample_user["id"], account_id=sample_account["id"]
            )
            assert len(transactions) == 1

            transactions = get_transactions_for_user(
                sample_user["id"], account_id=9999
            )
            assert len(transactions) == 0

    def test_pagination(self, app, sample_user, sample_account):
        with app.app_context():
            # Create multiple transactions
            for i in range(5):
                create_transaction(
                    user_id=sample_user["id"],
                    account_id=sample_account["id"],
                    amount=10.0,
                    transaction_type="expense",
                    txn_date="2024-01-15",
                )

            transactions = get_transactions_for_user(sample_user["id"], limit=3, offset=0)
            assert len(transactions) == 3

            transactions = get_transactions_for_user(sample_user["id"], limit=3, offset=3)
            assert len(transactions) == 2


class TestGetSpendingSummary:
    def test_returns_summary(self, app, sample_user, sample_transaction):
        with app.app_context():
            summary = get_spending_summary(sample_user["id"], "2024-01-01", "2024-12-31")
            assert len(summary) == 1
            assert summary[0]["total"] == 50.0
            assert summary[0]["count"] == 1

    def test_empty_date_range(self, app, sample_user, sample_transaction):
        with app.app_context():
            summary = get_spending_summary(sample_user["id"], "2025-01-01", "2025-12-31")
            assert len(summary) == 0
