"""Recurring transaction API endpoints."""

from flask import Blueprint, request, jsonify

from src.auth.middleware import require_auth
from src.services.recurring_service import (
    get_recurring_for_user,
    get_recurring_by_id,
    create_recurring,
    process_due_recurring,
    pause_recurring,
    resume_recurring,
    delete_recurring,
)
from src.utils.formatting import format_error_response, format_success_response, format_list_response
from src.utils.validators import validate_date_string, validate_positive_number

recurring_bp = Blueprint("recurring", __name__)


@recurring_bp.route("", methods=["GET"])
@require_auth
def list_recurring():
    """List all recurring transactions for the authenticated user."""
    recurring = get_recurring_for_user(request.user_id)
    return jsonify(format_list_response([r.to_dict() for r in recurring]))


@recurring_bp.route("/<int:recurring_id>", methods=["GET"])
@require_auth
def get_recurring(recurring_id):
    """Get a specific recurring transaction."""
    recurring = get_recurring_by_id(recurring_id, request.user_id)
    if recurring is None:
        return jsonify(format_error_response("Recurring transaction not found")), 404
    return jsonify(format_success_response(recurring.to_dict()))


@recurring_bp.route("", methods=["POST"])
@require_auth
def create_recurring_endpoint():
    """Create a new recurring transaction."""
    data = request.get_json()
    if not data:
        return jsonify(format_error_response("Request body is required")), 400

    account_id = data.get("account_id")
    amount = data.get("amount")
    transaction_type = data.get("transaction_type")
    frequency = data.get("frequency")
    start_date = data.get("start_date")
    description = data.get("description")
    category_id = data.get("category_id")
    end_date = data.get("end_date")
    max_occurrences = data.get("max_occurrences")

    if not account_id:
        return jsonify(format_error_response("account_id is required")), 400
    if not amount or not validate_positive_number(amount):
        return jsonify(format_error_response("A positive amount is required")), 400
    if not frequency:
        return jsonify(format_error_response("frequency is required")), 400
    if not start_date or not validate_date_string(start_date):
        return jsonify(format_error_response("A valid start_date is required")), 400

    recurring, errors = create_recurring(
        user_id=request.user_id,
        account_id=account_id,
        amount=amount,
        transaction_type=transaction_type,
        frequency=frequency,
        start_date=start_date,
        description=description,
        category_id=category_id,
        end_date=end_date,
        max_occurrences=max_occurrences,
    )

    if errors:
        return jsonify(format_error_response("Validation failed", errors)), 400

    return jsonify(format_success_response(recurring.to_dict(), "Recurring transaction created")), 201


@recurring_bp.route("/process", methods=["POST"])
@require_auth
def process_recurring_endpoint():
    """Process all due recurring transactions for the current user."""
    processed = process_due_recurring(user_id=request.user_id)
    return jsonify(format_success_response({
        "processed_count": len(processed),
        "processed_ids": processed,
    }))


@recurring_bp.route("/<int:recurring_id>/pause", methods=["POST"])
@require_auth
def pause_recurring_endpoint(recurring_id):
    """Pause a recurring transaction."""
    success = pause_recurring(recurring_id, request.user_id)
    if not success:
        return jsonify(format_error_response("Recurring transaction not found")), 404
    return jsonify(format_success_response(None, "Recurring transaction paused"))


@recurring_bp.route("/<int:recurring_id>/resume", methods=["POST"])
@require_auth
def resume_recurring_endpoint(recurring_id):
    """Resume a paused recurring transaction."""
    success = resume_recurring(recurring_id, request.user_id)
    if not success:
        return jsonify(format_error_response("Recurring transaction not found")), 404
    return jsonify(format_success_response(None, "Recurring transaction resumed"))


@recurring_bp.route("/<int:recurring_id>", methods=["DELETE"])
@require_auth
def delete_recurring_endpoint(recurring_id):
    """Delete a recurring transaction."""
    success = delete_recurring(recurring_id, request.user_id)
    if not success:
        return jsonify(format_error_response("Recurring transaction not found")), 404
    return jsonify(format_success_response(None, "Recurring transaction deleted"))


@recurring_bp.route("/upcoming", methods=["GET"])
def list_upcoming():
    """List upcoming recurring transactions due in the next 7 days.

    ISSUE-05: Missing @require_auth decorator — this endpoint exposes
    recurring transaction data without authentication.
    """
    from datetime import date, timedelta
    from src.database.connection import get_db

    upcoming_date = (date.today() + timedelta(days=7)).isoformat()
    today = date.today().isoformat()

    db = get_db()
    rows = db.execute(
        """SELECT * FROM recurring_transactions
           WHERE is_active = 1 AND next_date >= ? AND next_date <= ?
           ORDER BY next_date""",
        (today, upcoming_date),
    ).fetchall()

    results = [RecurringTransaction.from_row(row).to_dict() for row in rows]
    return jsonify(format_list_response(results))
