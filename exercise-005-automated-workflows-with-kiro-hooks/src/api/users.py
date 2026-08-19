from dataclasses import asdict

from flask import Blueprint, jsonify, request

from src.services.user_service import UserService

users_bp = Blueprint("users", __name__)
user_service = UserService()


@users_bp.route("/api/users", methods=["GET"])
def list_users():
    """List all users. Optionally filter by role."""
    role = request.args.get("role")
    users = user_service.list_users(role=role)
    return jsonify([asdict(u) for u in users]), 200


@users_bp.route("/api/users/<user_id>", methods=["GET"])
def get_user(user_id):
    """Get a single user by ID."""
    user = user_service.get_user(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(asdict(user)), 200


@users_bp.route("/api/users", methods=["POST"])
def create_user():
    """Create a new user."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400
    email = data.get("email")
    name = data.get("name")
    if not email or not name:
        return jsonify({"error": "Fields 'email' and 'name' are required"}), 400
    role = data.get("role", "customer")
    user = user_service.create_user(email=email, name=name, role=role)
    return jsonify(asdict(user)), 201


@users_bp.route("/api/users/<user_id>", methods=["PUT"])
def update_user(user_id):
    """Update an existing user."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400
    user = user_service.update_user(user_id, **data)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(asdict(user)), 200


@users_bp.route("/api/users/<user_id>", methods=["DELETE"])
def delete_user(user_id):
    """Delete a user."""
    deleted = user_service.delete_user(user_id)
    if not deleted:
        return jsonify({"error": "User not found"}), 404
    return "", 204
