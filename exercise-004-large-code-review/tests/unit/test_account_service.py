"""Tests for account service layer."""

import pytest
from src.services.account_service import (
    get_accounts_for_user,
    get_account_by_id,
    create_account,
    deactivate_account,
)
from src.database.connection import get_db


class TestGetAccountsForUser:
    def test_returns_user_accounts(self, app, sample_user, sample_account):
        with app.app_context():
            accounts = get_accounts_for_user(sample_user["id"])
            assert len(accounts) == 1
            assert accounts[0].name == "Checking Account"

    def test_returns_empty_for_no_accounts(self, app, sample_user):
        with app.app_context():
            accounts = get_accounts_for_user(sample_user["id"])
            assert len(accounts) == 0

    def test_excludes_inactive_accounts(self, app, sample_user, sample_account):
        with app.app_context():
            db = get_db()
            db.execute("UPDATE accounts SET is_active = 0 WHERE id = ?", (sample_account["id"],))
            db.commit()
            accounts = get_accounts_for_user(sample_user["id"])
            assert len(accounts) == 0


class TestGetAccountById:
    def test_returns_account(self, app, sample_user, sample_account):
        with app.app_context():
            account = get_account_by_id(sample_account["id"], sample_user["id"])
            assert account is not None
            assert account.name == "Checking Account"
            assert account.balance == 1000.0

    def test_returns_none_for_other_user(self, app, sample_user, second_user, sample_account):
        with app.app_context():
            account = get_account_by_id(sample_account["id"], second_user["id"])
            assert account is None

    def test_returns_none_for_nonexistent(self, app, sample_user):
        with app.app_context():
            account = get_account_by_id(9999, sample_user["id"])
            assert account is None


class TestCreateAccount:
    def test_creates_valid_account(self, app, sample_user):
        with app.app_context():
            account, errors = create_account(
                user_id=sample_user["id"],
                name="Savings Account",
                account_type="savings",
                balance=5000.0,
            )
            assert account is not None
            assert errors == []
            assert account.id is not None
            assert account.name == "Savings Account"

    def test_rejects_invalid_type(self, app, sample_user):
        with app.app_context():
            account, errors = create_account(
                user_id=sample_user["id"],
                name="Invalid",
                account_type="crypto",
                balance=100.0,
            )
            assert account is None
            assert len(errors) > 0

    def test_rejects_negative_balance_non_credit(self, app, sample_user):
        with app.app_context():
            account, errors = create_account(
                user_id=sample_user["id"],
                name="Bad Account",
                account_type="checking",
                balance=-100.0,
            )
            assert account is None
            assert len(errors) > 0

    def test_allows_negative_balance_credit(self, app, sample_user):
        with app.app_context():
            account, errors = create_account(
                user_id=sample_user["id"],
                name="Credit Card",
                account_type="credit",
                balance=-500.0,
            )
            assert account is not None
            assert errors == []


class TestDeactivateAccount:
    def test_deactivates_existing_account(self, app, sample_user, sample_account):
        with app.app_context():
            result = deactivate_account(sample_account["id"], sample_user["id"])
            assert result is True
            account = get_account_by_id(sample_account["id"], sample_user["id"])
            assert account is None

    def test_returns_false_for_other_user(self, app, sample_user, second_user, sample_account):
        with app.app_context():
            result = deactivate_account(sample_account["id"], second_user["id"])
            assert result is False
