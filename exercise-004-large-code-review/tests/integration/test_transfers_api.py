"""Integration tests for transfer API endpoints."""

import json
import pytest
from src.services.account_service import create_account


class TestCreateTransfer:
    def test_requires_auth(self, client):
        response = client.post("/api/transfers")
        assert response.status_code == 401

    def test_successful_transfer(self, client, auth_headers, app, sample_user):
        with app.app_context():
            acct1, _ = create_account(sample_user["id"], "From Account", "checking", 5000.0)
            acct2, _ = create_account(sample_user["id"], "To Account", "savings", 1000.0)

        response = client.post(
            "/api/transfers",
            headers=auth_headers,
            data=json.dumps({
                "from_account_id": acct1.id,
                "to_account_id": acct2.id,
                "amount": 500.0,
                "description": "Monthly savings",
            }),
        )
        assert response.status_code == 201
        data = response.get_json()
        assert data["data"]["amount"] == 500.0

    def test_rejects_missing_from_account(self, client, auth_headers):
        response = client.post(
            "/api/transfers",
            headers=auth_headers,
            data=json.dumps({
                "to_account_id": 1,
                "amount": 100.0,
            }),
        )
        assert response.status_code == 400

    def test_rejects_negative_amount(self, client, auth_headers):
        response = client.post(
            "/api/transfers",
            headers=auth_headers,
            data=json.dumps({
                "from_account_id": 1,
                "to_account_id": 2,
                "amount": -50.0,
            }),
        )
        assert response.status_code == 400


class TestTransferHistory:
    def test_requires_auth(self, client):
        response = client.get("/api/transfers/history")
        assert response.status_code == 401

    def test_returns_transfer_history(self, client, auth_headers, app, sample_user):
        with app.app_context():
            acct1, _ = create_account(sample_user["id"], "A1", "checking", 5000.0)
            acct2, _ = create_account(sample_user["id"], "A2", "savings", 0.0)

        # Create a transfer
        client.post(
            "/api/transfers",
            headers=auth_headers,
            data=json.dumps({
                "from_account_id": acct1.id,
                "to_account_id": acct2.id,
                "amount": 100.0,
            }),
        )

        response = client.get("/api/transfers/history", headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert len(data["data"]) == 2  # Two entries (debit + credit)
