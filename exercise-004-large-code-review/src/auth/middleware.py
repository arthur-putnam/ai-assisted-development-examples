"""Authentication middleware."""

from functools import wraps

from flask import request, jsonify

from src.auth.service import validate_token, get_user_by_id


def require_auth(f):
    """Decorator to require authentication for a route."""

    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Authorization header is required"}), 401

        parts = auth_header.split(" ", 1)
        if len(parts) != 2 or parts[0] != "Bearer":
            return jsonify({"error": "Invalid authorization format. Use: Bearer <token>"}), 401

        token = parts[1]
        user_id = validate_token(token)

        if user_id is None:
            return jsonify({"error": "Invalid or expired token"}), 401

        user = get_user_by_id(user_id)
        if user is None:
            return jsonify({"error": "User not found"}), 401

        request.user_id = user_id
        request.user = user
        return f(*args, **kwargs)

    return decorated
