"""Tests for budget service layer."""

import pytest
from src.services.budget_service import (
    get_budgets_for_user,
    get_budget_by_id,
    create_budget,
    get_budget_status,
    delete_budget,
)
from src.database.connection import get_db


class TestCreateBudget:
    def test_creates_valid_budget(self, app, sample_user, sample_category):
        with app.app_context():
            budget, errors = create_budget(
                user_id=sample_user["id"],
                category_id=sample_category["id"],
                amount=500.0,
                period="monthly",
                start_date="2024-01-01",
            )
            assert budget is not None
            assert errors == []
            assert budget.amount == 500.0
            assert budget.period == "monthly"

    def test_rejects_invalid_period(self, app, sample_user, sample_category):
        with app.app_context():
            budget, errors = create_budget(
                user_id=sample_user["id"],
                category_id=sample_category["id"],
                amount=500.0,
                period="daily",
                start_date="2024-01-01",
            )
            assert budget is None
            assert len(errors) > 0

    def test_rejects_invalid_category(self, app, sample_user):
        with app.app_context():
            budget, errors = create_budget(
                user_id=sample_user["id"],
                category_id=9999,
                amount=500.0,
                period="monthly",
                start_date="2024-01-01",
            )
            assert budget is None
            assert "Category not found or access denied" in errors

    def test_rejects_zero_amount(self, app, sample_user, sample_category):
        with app.app_context():
            budget, errors = create_budget(
                user_id=sample_user["id"],
                category_id=sample_category["id"],
                amount=0,
                period="monthly",
                start_date="2024-01-01",
            )
            assert budget is None
            assert len(errors) > 0


class TestGetBudgetStatus:
    def test_returns_budget_status(self, app, sample_user, sample_category, sample_transaction):
        with app.app_context():
            budget, _ = create_budget(
                user_id=sample_user["id"],
                category_id=sample_category["id"],
                amount=200.0,
                period="monthly",
                start_date="2024-01-01",
            )
            status = get_budget_status(budget.id, sample_user["id"])
            assert status is not None
            assert status["budgeted"] == 200.0
            assert status["spent"] == 50.0
            assert status["remaining"] == 150.0
            assert status["percentage_used"] == 25.0

    def test_returns_none_for_invalid_budget(self, app, sample_user):
        with app.app_context():
            status = get_budget_status(9999, sample_user["id"])
            assert status is None


class TestDeleteBudget:
    def test_deletes_budget(self, app, sample_user, sample_category):
        with app.app_context():
            budget, _ = create_budget(
                user_id=sample_user["id"],
                category_id=sample_category["id"],
                amount=300.0,
                period="weekly",
                start_date="2024-01-01",
            )
            result = delete_budget(budget.id, sample_user["id"])
            assert result is True

    def test_returns_false_for_nonexistent(self, app, sample_user):
        with app.app_context():
            result = delete_budget(9999, sample_user["id"])
            assert result is False
