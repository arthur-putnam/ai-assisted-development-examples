"""Integration tests for recurring transaction API endpoints."""

import json
import pytest


class TestListRecurring:
    def test_requires_auth(self, client):
        response = client.get("/api/recurring")
        assert response.status_code == 401

    def test_returns_empty_list(self, client, auth_headers):
        response = client.get("/api/recurring", headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data["count"] == 0


class TestCreateRecurring:
    def test_creates_recurring(self, client, auth_headers, sample_account):
        response = client.post(
            "/api/recurring",
            headers=auth_headers,
            data=json.dumps({
                "account_id": sample_account["id"],
                "amount": 15.99,
                "transaction_type": "expense",
                "frequency": "monthly",
                "start_date": "2024-02-01",
                "description": "Streaming service",
            }),
        )
        assert response.status_code == 201
        data = response.get_json()
        assert data["data"]["amount"] == 15.99
        assert data["data"]["frequency"] == "monthly"

    def test_rejects_invalid_frequency(self, client, auth_headers, sample_account):
        response = client.post(
            "/api/recurring",
            headers=auth_headers,
            data=json.dumps({
                "account_id": sample_account["id"],
                "amount": 50.0,
                "transaction_type": "expense",
                "frequency": "invalid",
                "start_date": "2024-01-01",
            }),
        )
        assert response.status_code == 400

    def test_rejects_missing_amount(self, client, auth_headers, sample_account):
        response = client.post(
            "/api/recurring",
            headers=auth_headers,
            data=json.dumps({
                "account_id": sample_account["id"],
                "transaction_type": "expense",
                "frequency": "monthly",
                "start_date": "2024-01-01",
            }),
        )
        assert response.status_code == 400


class TestPauseResume:
    def test_pause_and_resume(self, client, auth_headers, sample_account):
        # Create first
        response = client.post(
            "/api/recurring",
            headers=auth_headers,
            data=json.dumps({
                "account_id": sample_account["id"],
                "amount": 100.0,
                "transaction_type": "expense",
                "frequency": "monthly",
                "start_date": "2024-01-01",
            }),
        )
        recurring_id = response.get_json()["data"]["id"]

        # Pause
        response = client.post(f"/api/recurring/{recurring_id}/pause", headers=auth_headers)
        assert response.status_code == 200

        # Resume
        response = client.post(f"/api/recurring/{recurring_id}/resume", headers=auth_headers)
        assert response.status_code == 200


class TestDeleteRecurring:
    def test_deletes_recurring(self, client, auth_headers, sample_account):
        response = client.post(
            "/api/recurring",
            headers=auth_headers,
            data=json.dumps({
                "account_id": sample_account["id"],
                "amount": 50.0,
                "transaction_type": "expense",
                "frequency": "weekly",
                "start_date": "2024-01-01",
            }),
        )
        recurring_id = response.get_json()["data"]["id"]

        response = client.delete(f"/api/recurring/{recurring_id}", headers=auth_headers)
        assert response.status_code == 200

    def test_returns_404_for_nonexistent(self, client, auth_headers):
        response = client.delete("/api/recurring/9999", headers=auth_headers)
        assert response.status_code == 404
