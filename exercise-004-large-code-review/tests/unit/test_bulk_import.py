"""Tests for bulk import service."""

import pytest
from src.services.bulk_import_service import import_transactions_csv
from src.services.account_service import get_account_by_id


class TestImportCSV:
    def test_imports_valid_csv(self, app, sample_user, sample_account):
        with app.app_context():
            csv_content = """date,amount,type,description,category_id
2024-01-15,50.0,expense,Groceries,
2024-01-16,100.0,expense,Gas,
2024-01-17,3000.0,income,Salary,"""

            result, errors = import_transactions_csv(
                user_id=sample_user["id"],
                account_id=sample_account["id"],
                csv_content=csv_content,
            )

            assert errors == []
            assert result["imported_count"] == 3
            assert result["skipped_count"] == 0

    def test_skips_invalid_rows(self, app, sample_user, sample_account):
        with app.app_context():
            csv_content = """date,amount,type,description,category_id
2024-01-15,50.0,expense,Groceries,
,100.0,expense,No date,
2024-01-17,50.0,invalid,Bad type,"""

            result, errors = import_transactions_csv(
                user_id=sample_user["id"],
                account_id=sample_account["id"],
                csv_content=csv_content,
            )

            assert result["imported_count"] == 1
            assert result["skipped_count"] == 2

    def test_updates_account_balance(self, app, sample_user, sample_account):
        with app.app_context():
            csv_content = """date,amount,type,description,category_id
2024-01-15,100.0,expense,Test,"""

            import_transactions_csv(
                user_id=sample_user["id"],
                account_id=sample_account["id"],
                csv_content=csv_content,
            )

            account = get_account_by_id(sample_account["id"], sample_user["id"])
            assert account.balance == 900.0  # 1000 - 100

    def test_rejects_invalid_account(self, app, sample_user):
        with app.app_context():
            csv_content = "date,amount,type,description,category_id\n"
            result, errors = import_transactions_csv(
                user_id=sample_user["id"],
                account_id=9999,
                csv_content=csv_content,
            )
            assert result is None
            assert "Account not found" in errors[0]
