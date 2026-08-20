"""Tests for notification service."""

import pytest
from src.services.notification_service import (
    get_preferences_for_user,
    create_preference,
    delete_preference,
)
from src.database.connection import get_db


class TestCreatePreference:
    def test_creates_webhook_preference(self, app, sample_user):
        with app.app_context():
            pref, errors = create_preference(
                user_id=sample_user["id"],
                notify_type="large_transaction",
                channel="webhook",
                threshold=500.0,
                webhook_url="https://hooks.example.com/notify",
            )
            assert pref is not None
            assert errors == []
            assert pref.channel == "webhook"

    def test_creates_email_preference(self, app, sample_user):
        with app.app_context():
            pref, errors = create_preference(
                user_id=sample_user["id"],
                notify_type="budget_alert",
                channel="email",
                threshold=80.0,
                email_address="alerts@example.com",
            )
            assert pref is not None
            assert errors == []

    def test_rejects_invalid_type(self, app, sample_user):
        with app.app_context():
            pref, errors = create_preference(
                user_id=sample_user["id"],
                notify_type="invalid_type",
                channel="email",
                email_address="test@example.com",
            )
            assert pref is None
            assert len(errors) > 0

    def test_rejects_webhook_without_url(self, app, sample_user):
        with app.app_context():
            pref, errors = create_preference(
                user_id=sample_user["id"],
                notify_type="large_transaction",
                channel="webhook",
                threshold=100.0,
            )
            assert pref is None
            assert "webhook_url is required" in errors[0]


class TestGetPreferences:
    def test_returns_user_preferences(self, app, sample_user):
        with app.app_context():
            create_preference(
                user_id=sample_user["id"],
                notify_type="budget_alert",
                channel="email",
                email_address="test@example.com",
            )
            prefs = get_preferences_for_user(sample_user["id"])
            assert len(prefs) == 1

    def test_returns_empty_for_no_prefs(self, app, sample_user):
        with app.app_context():
            prefs = get_preferences_for_user(sample_user["id"])
            assert len(prefs) == 0


class TestDeletePreference:
    def test_deletes_preference(self, app, sample_user):
        with app.app_context():
            pref, _ = create_preference(
                user_id=sample_user["id"],
                notify_type="budget_alert",
                channel="email",
                email_address="test@example.com",
            )
            result = delete_preference(pref.id, sample_user["id"])
            assert result is True

    def test_returns_false_for_nonexistent(self, app, sample_user):
        with app.app_context():
            result = delete_preference(9999, sample_user["id"])
            assert result is False
