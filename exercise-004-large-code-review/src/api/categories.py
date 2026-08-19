"""Category API endpoints."""

from flask import Blueprint, request, jsonify

from src.auth.middleware import require_auth
from src.services.category_service import (
    get_categories_for_user,
    get_category_by_id,
    create_category,
    delete_category,
)
from src.utils.formatting import format_error_response, format_success_response, format_list_response
from src.utils.validators import sanitize_string

categories_bp = Blueprint("categories", __name__)


@categories_bp.route("", methods=["GET"])
@require_auth
def list_categories():
    """List all categories for the authenticated user."""
    categories = get_categories_for_user(request.user_id)
    return jsonify(format_list_response([c.to_dict() for c in categories]))


@categories_bp.route("/<int:category_id>", methods=["GET"])
@require_auth
def get_category_endpoint(category_id):
    """Get a specific category."""
    category = get_category_by_id(category_id, request.user_id)
    if category is None:
        return jsonify(format_error_response("Category not found")), 404
    return jsonify(format_success_response(category.to_dict()))


@categories_bp.route("", methods=["POST"])
@require_auth
def create_category_endpoint():
    """Create a new category."""
    data = request.get_json()
    if not data:
        return jsonify(format_error_response("Request body is required")), 400

    name = sanitize_string(data.get("name"))
    category_type = data.get("category_type")
    color = data.get("color", "#6B7280")

    if not name:
        return jsonify(format_error_response("Category name is required")), 400
    if not category_type:
        return jsonify(format_error_response("category_type is required")), 400

    category, errors = create_category(
        user_id=request.user_id,
        name=name,
        category_type=category_type,
        color=color,
    )

    if errors:
        return jsonify(format_error_response("Validation failed", errors)), 400

    return jsonify(format_success_response(category.to_dict(), "Category created")), 201


@categories_bp.route("/<int:category_id>", methods=["DELETE"])
@require_auth
def delete_category_endpoint(category_id):
    """Delete a category."""
    success, error = delete_category(category_id, request.user_id)
    if not success:
        status = 400 if error != "Category not found" else 404
        return jsonify(format_error_response(error)), status
    return jsonify(format_success_response(None, "Category deleted")), 200
