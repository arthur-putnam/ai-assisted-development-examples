"""Transfer API endpoints."""

from flask import Blueprint, request, jsonify

from src.auth.middleware import require_auth
from src.services.transfer_service import execute_transfer
from src.utils.formatting import format_error_response, format_success_response
from src.utils.validators import validate_positive_number

transfers_bp = Blueprint("transfers", __name__)


@transfers_bp.route("", methods=["POST"])
@require_auth
def create_transfer():
    """Create a transfer between accounts."""
    data = request.get_json()
    if not data:
        return jsonify(format_error_response("Request body is required")), 400

    from_account_id = data.get("from_account_id")
    to_account_id = data.get("to_account_id")
    amount = data.get("amount")
    description = data.get("description")

    if not from_account_id:
        return jsonify(format_error_response("from_account_id is required")), 400
    if not to_account_id:
        return jsonify(format_error_response("to_account_id is required")), 400
    if not amount or not validate_positive_number(amount):
        return jsonify(format_error_response("A positive amount is required")), 400

    result, errors = execute_transfer(
        user_id=request.user_id,
        from_account_id=from_account_id,
        to_account_id=to_account_id,
        amount=float(amount),
        description=description,
    )

    if errors:
        return jsonify(format_error_response("Transfer failed", errors)), 400

    return jsonify(format_success_response(result, "Transfer completed")), 201


@transfers_bp.route("/history", methods=["GET"])
@require_auth
def transfer_history():
    """Get transfer history for the authenticated user."""
    from src.database.connection import get_db

    db = get_db()
    rows = db.execute(
        """SELECT * FROM transactions
           WHERE user_id = ? AND transaction_type = 'transfer'
           ORDER BY date DESC, id DESC
           LIMIT 50""",
        (request.user_id,),
    ).fetchall()

    results = [dict(row) for row in rows]
    return jsonify(format_success_response(results))
