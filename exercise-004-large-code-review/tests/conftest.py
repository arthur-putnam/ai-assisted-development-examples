"""Shared test fixtures."""

import os
import tempfile
import json
import pytest

from src.app import create_app
from src.config import TestConfig
from src.database.connection import get_db
from src.auth.service import hash_password


@pytest.fixture
def app(tmp_path):
    """Create application for testing."""
    db_path = str(tmp_path / "test.db")

    class _TestConfig(TestConfig):
        DATABASE_PATH = db_path

    app = create_app(_TestConfig)

    ctx = app.app_context()
    ctx.push()

    yield app

    ctx.pop()


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def db(app):
    """Get database connection within app context."""
    return get_db()


@pytest.fixture
def sample_user(app):
    """Create a sample user and return user info."""
    database = get_db()
    password_hash = hash_password("testpassword123")
    cursor = database.execute(
        "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
        ("testuser", "test@example.com", password_hash),
    )
    database.commit()
    return {"id": cursor.lastrowid, "username": "testuser", "email": "test@example.com"}


@pytest.fixture
def second_user(app):
    """Create a second user for access control tests."""
    database = get_db()
    password_hash = hash_password("otherpassword")
    cursor = database.execute(
        "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
        ("otheruser", "other@example.com", password_hash),
    )
    database.commit()
    return {"id": cursor.lastrowid, "username": "otheruser", "email": "other@example.com"}


@pytest.fixture
def auth_headers(app, sample_user):
    """Generate auth headers for the sample user."""
    from src.auth.service import generate_token
    token = generate_token(sample_user["id"])
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture
def sample_account(app, sample_user):
    """Create a sample account."""
    database = get_db()
    cursor = database.execute(
        """INSERT INTO accounts (user_id, name, account_type, balance, currency)
           VALUES (?, ?, ?, ?, ?)""",
        (sample_user["id"], "Checking Account", "checking", 1000.0, "USD"),
    )
    database.commit()
    return {"id": cursor.lastrowid, "user_id": sample_user["id"], "balance": 1000.0}


@pytest.fixture
def sample_category(app, sample_user):
    """Create a sample expense category."""
    database = get_db()
    cursor = database.execute(
        "INSERT INTO categories (user_id, name, category_type, color) VALUES (?, ?, ?, ?)",
        (sample_user["id"], "Groceries", "expense", "#10B981"),
    )
    database.commit()
    return {"id": cursor.lastrowid, "user_id": sample_user["id"], "name": "Groceries"}


@pytest.fixture
def sample_transaction(app, sample_user, sample_account, sample_category):
    """Create a sample transaction."""
    database = get_db()
    cursor = database.execute(
        """INSERT INTO transactions (account_id, user_id, amount, transaction_type, description, category_id, date)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (sample_account["id"], sample_user["id"], 50.0, "expense", "Weekly groceries", sample_category["id"], "2024-01-15"),
    )
    # Also update the account balance to reflect this transaction
    database.execute(
        "UPDATE accounts SET balance = balance - 50.0 WHERE id = ?",
        (sample_account["id"],),
    )
    database.commit()
    return {
        "id": cursor.lastrowid,
        "account_id": sample_account["id"],
        "amount": 50.0,
        "transaction_type": "expense",
    }
