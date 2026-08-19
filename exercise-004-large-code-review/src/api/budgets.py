"""Budget API endpoints."""

from flask import Blueprint, request, jsonify

from src.auth.middleware import require_auth
from src.services.budget_service import (
    get_budgets_for_user,
    get_budget_by_id,
    create_budget,
    get_budget_status,
    delete_budget,
)
from src.utils.formatting import format_error_response, format_success_response, format_list_response
from src.utils.validators import validate_date_string, validate_positive_number

budgets_bp = Blueprint("budgets", __name__)


@budgets_bp.route("", methods=["GET"])
@require_auth
def list_budgets():
    """List all budgets for the authenticated user."""
    budgets = get_budgets_for_user(request.user_id)
    return jsonify(format_list_response(budgets))


@budgets_bp.route("/<int:budget_id>", methods=["GET"])
@require_auth
def get_budget(budget_id):
    """Get a specific budget."""
    budget = get_budget_by_id(budget_id, request.user_id)
    if budget is None:
        return jsonify(format_error_response("Budget not found")), 404
    return jsonify(format_success_response(budget.to_dict()))


@budgets_bp.route("/<int:budget_id>/status", methods=["GET"])
@require_auth
def budget_status(budget_id):
    """Get budget status with spending progress."""
    status = get_budget_status(budget_id, request.user_id)
    if status is None:
        return jsonify(format_error_response("Budget not found")), 404
    return jsonify(format_success_response(status))


@budgets_bp.route("", methods=["POST"])
@require_auth
def create_budget_endpoint():
    """Create a new budget."""
    data = request.get_json()
    if not data:
        return jsonify(format_error_response("Request body is required")), 400

    category_id = data.get("category_id")
    amount = data.get("amount")
    period = data.get("period")
    start_date = data.get("start_date")
    end_date = data.get("end_date")

    if not category_id:
        return jsonify(format_error_response("category_id is required")), 400
    if not amount or not validate_positive_number(amount):
        return jsonify(format_error_response("A positive amount is required")), 400
    if not start_date or not validate_date_string(start_date):
        return jsonify(format_error_response("A valid start_date is required (YYYY-MM-DD)")), 400
    if end_date and not validate_date_string(end_date):
        return jsonify(format_error_response("Invalid end_date format (YYYY-MM-DD)")), 400

    budget, errors = create_budget(
        user_id=request.user_id,
        category_id=category_id,
        amount=amount,
        period=period,
        start_date=start_date,
        end_date=end_date,
    )

    if errors:
        return jsonify(format_error_response("Validation failed", errors)), 400

    return jsonify(format_success_response(budget.to_dict(), "Budget created")), 201


@budgets_bp.route("/<int:budget_id>", methods=["DELETE"])
@require_auth
def delete_budget_endpoint(budget_id):
    """Delete a budget."""
    success = delete_budget(budget_id, request.user_id)
    if not success:
        return jsonify(format_error_response("Budget not found")), 404
    return jsonify(format_success_response(None, "Budget deleted")), 200
