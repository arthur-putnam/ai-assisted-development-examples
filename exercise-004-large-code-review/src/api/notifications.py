"""Notification preferences API endpoints."""

from flask import Blueprint, request, jsonify

from src.auth.middleware import require_auth
from src.services.notification_service import (
    get_preferences_for_user,
    create_preference,
    delete_preference,
)
from src.utils.formatting import format_error_response, format_success_response, format_list_response

notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.route("/preferences", methods=["GET"])
@require_auth
def list_preferences():
    """List all notification preferences for the authenticated user."""
    prefs = get_preferences_for_user(request.user_id)
    return jsonify(format_list_response([p.to_dict() for p in prefs]))


@notifications_bp.route("/preferences", methods=["POST"])
@require_auth
def create_preference_endpoint():
    """Create a new notification preference."""
    data = request.get_json()
    if not data:
        return jsonify(format_error_response("Request body is required")), 400

    notify_type = data.get("notify_type")
    channel = data.get("channel")
    threshold = data.get("threshold")
    webhook_url = data.get("webhook_url")
    email_address = data.get("email_address")

    if not notify_type:
        return jsonify(format_error_response("notify_type is required")), 400
    if not channel:
        return jsonify(format_error_response("channel is required")), 400

    pref, errors = create_preference(
        user_id=request.user_id,
        notify_type=notify_type,
        channel=channel,
        threshold=threshold,
        webhook_url=webhook_url,
        email_address=email_address,
    )

    if errors:
        return jsonify(format_error_response("Validation failed", errors)), 400

    return jsonify(format_success_response(pref.to_dict(), "Notification preference created")), 201


@notifications_bp.route("/preferences/<int:pref_id>", methods=["DELETE"])
@require_auth
def delete_preference_endpoint(pref_id):
    """Delete a notification preference."""
    success = delete_preference(pref_id, request.user_id)
    if not success:
        return jsonify(format_error_response("Preference not found")), 404
    return jsonify(format_success_response(None, "Preference deleted"))
