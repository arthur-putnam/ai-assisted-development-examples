"""Authentication service for token validation and user management."""

import hashlib
import hmac
import json
import time

from flask import current_app

from src.database.connection import get_db


def hash_password(password):
    """Hash a password using SHA-256 with salt."""
    salt = current_app.config["SECRET_KEY"]
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000
    ).hex()


def verify_password(password, password_hash):
    """Verify a password against its hash."""
    return hmac.compare_digest(hash_password(password), password_hash)


def generate_token(user_id):
    """Generate an authentication token."""
    expiry = int(time.time()) + (current_app.config["TOKEN_EXPIRY_HOURS"] * 3600)
    payload = json.dumps({"user_id": user_id, "exp": expiry})
    secret = current_app.config["SECRET_KEY"]
    signature = hmac.HMAC(
        secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    token = f"{payload}|{signature}"
    return token


def validate_token(token):
    """Validate an authentication token and return user_id if valid."""
    if not token:
        return None

    try:
        parts = token.split("|", 1)
        if len(parts) != 2:
            return None

        payload_str, signature = parts
        secret = current_app.config["SECRET_KEY"]
        expected_sig = hmac.HMAC(
            secret.encode("utf-8"), payload_str.encode("utf-8"), hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(signature, expected_sig):
            return None

        payload = json.loads(payload_str)
        if payload.get("exp", 0) < time.time():
            return None

        return payload.get("user_id")
    except (ValueError, KeyError):
        return None


def get_user_by_id(user_id):
    """Retrieve a user by ID."""
    db = get_db()
    row = db.execute("SELECT * FROM users WHERE id = ? AND is_active = 1", (user_id,)).fetchone()
    if row:
        return dict(row)
    return None


def create_user(username, email, password):
    """Create a new user."""
    db = get_db()
    password_hash = hash_password(password)
    try:
        cursor = db.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
            (username, email, password_hash),
        )
        db.commit()
        return cursor.lastrowid
    except Exception:
        db.rollback()
        return None


def can_access_account(user_id, account_id):
    """Check if a user has access to a specific account."""
    db = get_db()
    row = db.execute(
        "SELECT id FROM accounts WHERE id = ? AND user_id = ?",
        (account_id, user_id),
    ).fetchone()
    return row is not None
