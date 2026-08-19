"""Integration tests for account API endpoints."""

import json
import pytest


class TestListAccounts:
    def test_requires_auth(self, client):
        response = client.get("/api/accounts")
        assert response.status_code == 401

    def test_returns_user_accounts(self, client, auth_headers, sample_account):
        response = client.get("/api/accounts", headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data["count"] == 1
        assert data["data"][0]["name"] == "Checking Account"

    def test_returns_empty_list(self, client, auth_headers):
        response = client.get("/api/accounts", headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data["count"] == 0


class TestGetAccount:
    def test_returns_account(self, client, auth_headers, sample_account):
        response = client.get(f"/api/accounts/{sample_account['id']}", headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["name"] == "Checking Account"
        assert data["data"]["balance"] == 1000.0

    def test_returns_404_for_nonexistent(self, client, auth_headers):
        response = client.get("/api/accounts/9999", headers=auth_headers)
        assert response.status_code == 404


class TestCreateAccount:
    def test_creates_account(self, client, auth_headers):
        response = client.post(
            "/api/accounts",
            headers=auth_headers,
            data=json.dumps({
                "name": "New Savings",
                "account_type": "savings",
                "balance": 2500.0,
            }),
        )
        assert response.status_code == 201
        data = response.get_json()
        assert data["data"]["name"] == "New Savings"
        assert data["message"] == "Account created"

    def test_rejects_invalid_type(self, client, auth_headers):
        response = client.post(
            "/api/accounts",
            headers=auth_headers,
            data=json.dumps({
                "name": "Bad Account",
                "account_type": "invalid",
                "balance": 100.0,
            }),
        )
        assert response.status_code == 400

    def test_rejects_missing_name(self, client, auth_headers):
        response = client.post(
            "/api/accounts",
            headers=auth_headers,
            data=json.dumps({
                "account_type": "savings",
                "balance": 100.0,
            }),
        )
        assert response.status_code == 400


class TestDeleteAccount:
    def test_deactivates_account(self, client, auth_headers, sample_account):
        response = client.delete(f"/api/accounts/{sample_account['id']}", headers=auth_headers)
        assert response.status_code == 200

        # Verify it's gone from list
        response = client.get("/api/accounts", headers=auth_headers)
        data = response.get_json()
        assert data["count"] == 0

    def test_returns_404_for_nonexistent(self, client, auth_headers):
        response = client.delete("/api/accounts/9999", headers=auth_headers)
        assert response.status_code == 404
