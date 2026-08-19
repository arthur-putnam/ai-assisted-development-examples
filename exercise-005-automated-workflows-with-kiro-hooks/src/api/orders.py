from dataclasses import asdict

from flask import Blueprint, jsonify, request

from src.services.order_service import OrderService

orders_bp = Blueprint("orders", __name__)
order_service = OrderService()


@orders_bp.route("/api/orders", methods=["GET"])
def list_orders():
    """List all orders. Optionally filter by user_id."""
    user_id = request.args.get("user_id")
    orders = order_service.list_orders(user_id=user_id)
    return jsonify([asdict(o) for o in orders]), 200


@orders_bp.route("/api/orders/<order_id>", methods=["GET"])
def get_order(order_id):
    """Get a single order by ID."""
    order = order_service.get_order(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404
    return jsonify(asdict(order)), 200


@orders_bp.route("/api/orders", methods=["POST"])
def create_order():
    """Create a new order."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400
    user_id = data.get("user_id")
    items = data.get("items")
    if not user_id or not items:
        return jsonify({"error": "Fields 'user_id' and 'items' are required"}), 400
    for item in items:
        if not all(k in item for k in ("product_id", "quantity", "unit_price")):
            return jsonify({"error": "Each item requires 'product_id', 'quantity', and 'unit_price'"}), 400
    order = order_service.create_order(user_id=user_id, items=items)
    return jsonify(asdict(order)), 201


@orders_bp.route("/api/orders/<order_id>/status", methods=["PATCH"])
def update_order_status(order_id):
    """Update the status of an order."""
    data = request.get_json()
    if not data or "status" not in data:
        return jsonify({"error": "Field 'status' is required"}), 400
    try:
        order = order_service.update_order_status(order_id, data["status"])
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    if not order:
        return jsonify({"error": "Order not found"}), 404
    return jsonify(asdict(order)), 200


@orders_bp.route("/api/orders/<order_id>/cancel", methods=["POST"])
def cancel_order(order_id):
    """Cancel a pending or confirmed order."""
    try:
        order = order_service.cancel_order(order_id)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    if not order:
        return jsonify({"error": "Order not found"}), 404
    return jsonify(asdict(order)), 200
