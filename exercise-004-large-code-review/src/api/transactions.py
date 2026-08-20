"""Transaction API endpoints."""

from flask import Blueprint, request, jsonify

from src.auth.middleware import require_auth
from src.services.transaction_service import (
    get_transactions_for_user,
    get_transaction_by_id,
    create_transaction,
    delete_transaction,
    get_spending_summary,
)
from src.utils.formatting import format_error_response, format_success_response, format_list_response
from src.utils.validators import validate_pagination, validate_date_string, sanitize_string

transactions_bp = Blueprint("transactions", __name__)


@transactions_bp.route("", methods=["GET"])
@require_auth
def list_transactions():
    """List transactions with optional filtering and pagination."""
    page = request.args.get("page", 1)
    page_size = request.args.get("page_size", 20)
    account_id = request.args.get("account_id", type=int)

    page, page_size, offset = validate_pagination(page, page_size)

    transactions = get_transactions_for_user(
        user_id=request.user_id,
        account_id=account_id,
        limit=page_size,
        offset=offset,
    )

    return jsonify(format_list_response(
        [t.to_dict() for t in transactions],
        page=page,
        page_size=page_size,
    ))


@transactions_bp.route("/<int:transaction_id>", methods=["GET"])
@require_auth
def get_transaction(transaction_id):
    """Get a specific transaction."""
    transaction = get_transaction_by_id(transaction_id, request.user_id)
    if transaction is None:
        return jsonify(format_error_response("Transaction not found")), 404
    return jsonify(format_success_response(transaction.to_dict()))


@transactions_bp.route("", methods=["POST"])
@require_auth
def create_transaction_endpoint():
    """Create a new transaction."""
    data = request.get_json()
    if not data:
        return jsonify(format_error_response("Request body is required")), 400

    account_id = data.get("account_id")
    amount = data.get("amount")
    transaction_type = data.get("transaction_type")
    description = sanitize_string(data.get("description"))
    category_id = data.get("category_id")
    txn_date = data.get("date")

    if not account_id:
        return jsonify(format_error_response("account_id is required")), 400
    if amount is None:
        return jsonify(format_error_response("amount is required")), 400
    if not transaction_type:
        return jsonify(format_error_response("transaction_type is required")), 400

    if txn_date and not validate_date_string(txn_date):
        return jsonify(format_error_response("Invalid date format. Use YYYY-MM-DD")), 400

    transaction, errors = create_transaction(
        user_id=request.user_id,
        account_id=account_id,
        amount=amount,
        transaction_type=transaction_type,
        description=description,
        category_id=category_id,
        txn_date=txn_date,
    )

    if errors:
        return jsonify(format_error_response("Validation failed", errors)), 400

    # Handle case where transaction might be a dict (error status)
    if isinstance(transaction, dict):
        return jsonify(format_success_response(transaction)), 201
    return jsonify(format_success_response(transaction.to_dict(), "Transaction created")), 201


@transactions_bp.route("/<int:transaction_id>", methods=["DELETE"])
@require_auth
def delete_transaction_endpoint(transaction_id):
    """Delete a transaction and reverse the balance change."""
    success = delete_transaction(transaction_id, request.user_id)
    if not success:
        return jsonify(format_error_response("Transaction not found")), 404
    return jsonify(format_success_response(None, "Transaction deleted")), 200


@transactions_bp.route("/summary", methods=["GET"])
@require_auth
def spending_summary():
    """Get spending summary by category for a date range."""
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    if not start_date or not end_date:
        return jsonify(format_error_response("start_date and end_date are required")), 400

    if not validate_date_string(start_date) or not validate_date_string(end_date):
        return jsonify(format_error_response("Invalid date format. Use YYYY-MM-DD")), 400

    summary = get_spending_summary(request.user_id, start_date, end_date)
    return jsonify(format_success_response(summary))
