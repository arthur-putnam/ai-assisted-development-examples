"""Integration tests for transaction API endpoints."""

import json
import pytest


class TestListTransactions:
    def test_requires_auth(self, client):
        response = client.get("/api/transactions")
        assert response.status_code == 401

    def test_returns_user_transactions(self, client, auth_headers, sample_transaction):
        response = client.get("/api/transactions", headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data["count"] == 1

    def test_supports_pagination(self, client, auth_headers, sample_account):
        # Create multiple transactions
        for i in range(5):
            client.post(
                "/api/transactions",
                headers=auth_headers,
                data=json.dumps({
                    "account_id": sample_account["id"],
                    "amount": 10.0,
                    "transaction_type": "expense",
                    "date": "2024-01-15",
                }),
            )

        response = client.get("/api/transactions?page=1&page_size=3", headers=auth_headers)
        data = response.get_json()
        assert data["count"] == 3
        assert data["page"] == 1


class TestCreateTransaction:
    def test_creates_expense(self, client, auth_headers, sample_account):
        response = client.post(
            "/api/transactions",
            headers=auth_headers,
            data=json.dumps({
                "account_id": sample_account["id"],
                "amount": 75.50,
                "transaction_type": "expense",
                "description": "Restaurant",
                "date": "2024-02-01",
            }),
        )
        assert response.status_code == 201
        data = response.get_json()
        assert data["data"]["amount"] == 75.50

    def test_creates_income(self, client, auth_headers, sample_account):
        response = client.post(
            "/api/transactions",
            headers=auth_headers,
            data=json.dumps({
                "account_id": sample_account["id"],
                "amount": 3000.0,
                "transaction_type": "income",
                "description": "Monthly salary",
                "date": "2024-01-01",
            }),
        )
        assert response.status_code == 201

    def test_rejects_missing_account(self, client, auth_headers):
        response = client.post(
            "/api/transactions",
            headers=auth_headers,
            data=json.dumps({
                "amount": 50.0,
                "transaction_type": "expense",
            }),
        )
        assert response.status_code == 400

    def test_rejects_invalid_date(self, client, auth_headers, sample_account):
        response = client.post(
            "/api/transactions",
            headers=auth_headers,
            data=json.dumps({
                "account_id": sample_account["id"],
                "amount": 50.0,
                "transaction_type": "expense",
                "date": "not-a-date",
            }),
        )
        assert response.status_code == 400


class TestDeleteTransaction:
    def test_deletes_transaction(self, client, auth_headers, sample_transaction):
        response = client.delete(
            f"/api/transactions/{sample_transaction['id']}", headers=auth_headers
        )
        assert response.status_code == 200

    def test_returns_404_for_nonexistent(self, client, auth_headers):
        response = client.delete("/api/transactions/9999", headers=auth_headers)
        assert response.status_code == 404


class TestSpendingSummary:
    def test_returns_summary(self, client, auth_headers, sample_transaction):
        response = client.get(
            "/api/transactions/summary?start_date=2024-01-01&end_date=2024-12-31",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.get_json()
        assert len(data["data"]) == 1

    def test_requires_dates(self, client, auth_headers):
        response = client.get("/api/transactions/summary", headers=auth_headers)
        assert response.status_code == 400
