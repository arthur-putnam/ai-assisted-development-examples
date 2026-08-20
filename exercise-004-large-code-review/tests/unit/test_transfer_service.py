"""Tests for transfer service."""

import pytest
from src.services.transfer_service import execute_transfer
from src.services.account_service import get_account_by_id, create_account
from src.database.connection import get_db


class TestExecuteTransfer:
    def test_successful_transfer(self, app, sample_user):
        with app.app_context():
            account1, _ = create_account(sample_user["id"], "Checking", "checking", 1000.0)
            account2, _ = create_account(sample_user["id"], "Savings", "savings", 500.0)

            result, errors = execute_transfer(
                user_id=sample_user["id"],
                from_account_id=account1.id,
                to_account_id=account2.id,
                amount=200.0,
                description="Monthly savings",
            )

            assert result is not None
            assert errors == []
            assert result["amount"] == 200.0

            # Check balances
            from_acct = get_account_by_id(account1.id, sample_user["id"])
            to_acct = get_account_by_id(account2.id, sample_user["id"])
            assert from_acct.balance == 800.0
            assert to_acct.balance == 700.0

    def test_rejects_insufficient_balance(self, app, sample_user):
        with app.app_context():
            account1, _ = create_account(sample_user["id"], "Checking", "checking", 100.0)
            account2, _ = create_account(sample_user["id"], "Savings", "savings", 0.0)

            result, errors = execute_transfer(
                user_id=sample_user["id"],
                from_account_id=account1.id,
                to_account_id=account2.id,
                amount=500.0,
            )

            assert result is None
            assert "Insufficient balance" in errors[0]

    def test_rejects_same_account(self, app, sample_user):
        with app.app_context():
            account, _ = create_account(sample_user["id"], "Checking", "checking", 1000.0)

            result, errors = execute_transfer(
                user_id=sample_user["id"],
                from_account_id=account.id,
                to_account_id=account.id,
                amount=100.0,
            )

            assert result is None
            assert "same account" in errors[0]

    def test_rejects_negative_amount(self, app, sample_user):
        with app.app_context():
            account1, _ = create_account(sample_user["id"], "A1", "checking", 1000.0)
            account2, _ = create_account(sample_user["id"], "A2", "checking", 0.0)

            result, errors = execute_transfer(
                user_id=sample_user["id"],
                from_account_id=account1.id,
                to_account_id=account2.id,
                amount=-100.0,
            )

            assert result is None
            assert len(errors) > 0

    def test_cross_currency_applies_fee(self, app, sample_user):
        with app.app_context():
            db = get_db()
            # Create accounts with different currencies
            cursor1 = db.execute(
                """INSERT INTO accounts (user_id, name, account_type, balance, currency)
                   VALUES (?, ?, ?, ?, ?)""",
                (sample_user["id"], "USD Account", "checking", 10000.0, "USD"),
            )
            cursor2 = db.execute(
                """INSERT INTO accounts (user_id, name, account_type, balance, currency)
                   VALUES (?, ?, ?, ?, ?)""",
                (sample_user["id"], "EUR Account", "checking", 0.0, "EUR"),
            )
            db.commit()

            result, errors = execute_transfer(
                user_id=sample_user["id"],
                from_account_id=cursor1.lastrowid,
                to_account_id=cursor2.lastrowid,
                amount=1000.0,
            )

            assert result is not None
            assert result["fee"] == 5.0  # 0.5% of 1000
            assert result["total_debited"] == 1005.0
