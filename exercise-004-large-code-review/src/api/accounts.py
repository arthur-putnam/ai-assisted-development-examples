"""Account API endpoints."""

from flask import Blueprint, request, jsonify

from src.auth.middleware import require_auth
from src.services.account_service import (
    get_accounts_for_user,
    get_account_by_id,
    create_account,
    deactivate_account,
)
from src.utils.formatting import format_error_response, format_success_response, format_list_response
from src.utils.validators import sanitize_string

accounts_bp = Blueprint("accounts", __name__)


@accounts_bp.route("", methods=["GET"])
@require_auth
def list_accounts():
    """List all accounts for the authenticated user."""
    accounts = get_accounts_for_user(request.user_id)
    return jsonify(format_list_response([a.to_dict() for a in accounts]))


@accounts_bp.route("/<int:account_id>", methods=["GET"])
@require_auth
def get_account(account_id):
    """Get a specific account by ID."""
    account = get_account_by_id(account_id, request.user_id)
    if account is None:
        return jsonify(format_error_response("Account not found")), 404
    return jsonify(format_success_response(account.to_dict()))


@accounts_bp.route("", methods=["POST"])
@require_auth
def create_account_endpoint():
    """Create a new account."""
    data = request.get_json()
    if not data:
        return jsonify(format_error_response("Request body is required")), 400

    name = sanitize_string(data.get("name"))
    account_type = data.get("account_type")
    balance = data.get("balance", 0.0)
    currency = data.get("currency", "USD")

    if not name:
        return jsonify(format_error_response("Account name is required")), 400

    account, errors = create_account(
        user_id=request.user_id,
        name=name,
        account_type=account_type,
        balance=balance,
        currency=currency,
    )

    if errors:
        return jsonify(format_error_response("Validation failed", errors)), 400

    return jsonify(format_success_response(account.to_dict(), "Account created")), 201


@accounts_bp.route("/<int:account_id>", methods=["DELETE"])
@require_auth
def delete_account(account_id):
    """Deactivate an account."""
    success = deactivate_account(account_id, request.user_id)
    if not success:
        return jsonify(format_error_response("Account not found")), 404
    return jsonify(format_success_response(None, "Account deactivated")), 200
