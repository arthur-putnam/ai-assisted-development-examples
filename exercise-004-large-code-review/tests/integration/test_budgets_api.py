"""Integration tests for budget API endpoints."""

import json
import pytest


class TestListBudgets:
    def test_requires_auth(self, client):
        response = client.get("/api/budgets")
        assert response.status_code == 401

    def test_returns_user_budgets(self, client, auth_headers, sample_category):
        # Create a budget first
        client.post(
            "/api/budgets",
            headers=auth_headers,
            data=json.dumps({
                "category_id": sample_category["id"],
                "amount": 500.0,
                "period": "monthly",
                "start_date": "2024-01-01",
            }),
        )
        response = client.get("/api/budgets", headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data["count"] == 1


class TestCreateBudget:
    def test_creates_budget(self, client, auth_headers, sample_category):
        response = client.post(
            "/api/budgets",
            headers=auth_headers,
            data=json.dumps({
                "category_id": sample_category["id"],
                "amount": 300.0,
                "period": "weekly",
                "start_date": "2024-01-01",
                "end_date": "2024-12-31",
            }),
        )
        assert response.status_code == 201
        data = response.get_json()
        assert data["data"]["amount"] == 300.0

    def test_rejects_invalid_amount(self, client, auth_headers, sample_category):
        response = client.post(
            "/api/budgets",
            headers=auth_headers,
            data=json.dumps({
                "category_id": sample_category["id"],
                "amount": -100.0,
                "period": "monthly",
                "start_date": "2024-01-01",
            }),
        )
        assert response.status_code == 400

    def test_rejects_invalid_date(self, client, auth_headers, sample_category):
        response = client.post(
            "/api/budgets",
            headers=auth_headers,
            data=json.dumps({
                "category_id": sample_category["id"],
                "amount": 300.0,
                "period": "monthly",
                "start_date": "not-a-date",
            }),
        )
        assert response.status_code == 400


class TestBudgetStatus:
    def test_returns_status(self, client, auth_headers, sample_category, sample_transaction):
        # Create budget
        response = client.post(
            "/api/budgets",
            headers=auth_headers,
            data=json.dumps({
                "category_id": sample_category["id"],
                "amount": 200.0,
                "period": "monthly",
                "start_date": "2024-01-01",
            }),
        )
        budget_id = response.get_json()["data"]["id"]

        response = client.get(f"/api/budgets/{budget_id}/status", headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["budgeted"] == 200.0
        assert data["data"]["spent"] == 50.0

    def test_returns_404_for_nonexistent(self, client, auth_headers):
        response = client.get("/api/budgets/9999/status", headers=auth_headers)
        assert response.status_code == 404


class TestDeleteBudget:
    def test_deletes_budget(self, client, auth_headers, sample_category):
        response = client.post(
            "/api/budgets",
            headers=auth_headers,
            data=json.dumps({
                "category_id": sample_category["id"],
                "amount": 200.0,
                "period": "monthly",
                "start_date": "2024-01-01",
            }),
        )
        budget_id = response.get_json()["data"]["id"]

        response = client.delete(f"/api/budgets/{budget_id}", headers=auth_headers)
        assert response.status_code == 200

    def test_returns_404_for_nonexistent(self, client, auth_headers):
        response = client.delete("/api/budgets/9999", headers=auth_headers)
        assert response.status_code == 404
