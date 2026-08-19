"""Flask application — REST API for inventory management."""

from flask import Flask, jsonify, request

from .models import MovementType
from .services import CategoryService, ProductService, StockService
from .store import store

app = Flask(__name__)

category_service = CategoryService()
product_service = ProductService()
stock_service = StockService()


@app.before_request
def initialize_data():
    """Load sample data on first request if store is empty."""
    if not store.categories:
        import os
        data_path = os.path.join(os.path.dirname(__file__), "..", "data", "sample_inventory.json")
        if os.path.exists(data_path):
            store.load_from_file(data_path)


# --- Category endpoints ---


@app.route("/categories", methods=["GET"])
def list_categories():
    categories = category_service.list_categories()
    return jsonify([c.model_dump() for c in categories])


@app.route("/categories/<category_id>", methods=["GET"])
def get_category(category_id):
    category = category_service.get_category(category_id)
    if not category:
        return jsonify({"error": "Category not found"}), 404
    return jsonify(category.model_dump())


@app.route("/categories", methods=["POST"])
def create_category():
    data = request.get_json()
    if not data or "id" not in data or "name" not in data:
        return jsonify({"error": "Missing required fields: id, name"}), 400
    try:
        category = category_service.create_category(
            category_id=data["id"],
            name=data["name"],
            description=data.get("description"),
        )
        return jsonify(category.model_dump()), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 409


@app.route("/categories/<category_id>", methods=["DELETE"])
def delete_category(category_id):
    try:
        category_service.delete_category(category_id)
        return "", 204
    except KeyError:
        return jsonify({"error": "Category not found"}), 404
    except ValueError as e:
        return jsonify({"error": str(e)}), 409


# --- Product endpoints ---


@app.route("/products", methods=["GET"])
def list_products():
    category_id = request.args.get("category_id")
    products = product_service.list_products(category_id=category_id)
    return jsonify([p.model_dump() for p in products])


@app.route("/products/<sku>", methods=["GET"])
def get_product(sku):
    product = product_service.get_product(sku)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    return jsonify(product.model_dump())


@app.route("/products", methods=["POST"])
def create_product():
    data = request.get_json()
    required_fields = ["sku", "name", "category_id", "unit_price", "reorder_threshold"]
    if not data or any(f not in data for f in required_fields):
        return jsonify({"error": f"Missing required fields: {required_fields}"}), 400
    try:
        product = product_service.create_product(
            sku=data["sku"],
            name=data["name"],
            category_id=data["category_id"],
            unit_price=data["unit_price"],
            reorder_threshold=data["reorder_threshold"],
            description=data.get("description"),
        )
        return jsonify(product.model_dump()), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 409


@app.route("/products/<sku>", methods=["DELETE"])
def delete_product(sku):
    try:
        product_service.delete_product(sku)
        return "", 204
    except KeyError:
        return jsonify({"error": "Product not found"}), 404


# --- Stock endpoints ---


@app.route("/stock/<sku>/level", methods=["GET"])
def get_stock_level(sku):
    try:
        level = stock_service.get_stock_level(sku)
        product = product_service.get_product(sku)
        return jsonify({
            "product_sku": sku,
            "product_name": product.name,
            "current_stock": level,
            "reorder_threshold": product.reorder_threshold,
        })
    except KeyError:
        return jsonify({"error": "Product not found"}), 404


@app.route("/stock/movements", methods=["POST"])
def record_movement():
    data = request.get_json()
    if not data or "product_sku" not in data or "type" not in data or "quantity" not in data:
        return jsonify({"error": "Missing required fields: product_sku, type, quantity"}), 400
    try:
        movement_type = MovementType(data["type"])
    except ValueError:
        valid_types = [t.value for t in MovementType]
        return jsonify({"error": f"Invalid movement type. Must be one of: {valid_types}"}), 400

    try:
        movement = stock_service.record_movement(
            product_sku=data["product_sku"],
            movement_type=movement_type,
            quantity=data["quantity"],
            note=data.get("note"),
        )
        return jsonify(movement.model_dump(mode="json")), 201
    except KeyError as e:
        return jsonify({"error": str(e)}), 404


@app.route("/stock/movements", methods=["GET"])
def list_movements():
    product_sku = request.args.get("product_sku")
    movement_type_str = request.args.get("type")
    movement_type = MovementType(movement_type_str) if movement_type_str else None

    movements = stock_service.get_movement_history(
        product_sku=product_sku,
        movement_type=movement_type,
    )
    return jsonify([m.model_dump(mode="json") for m in movements])


@app.route("/stock/alerts", methods=["GET"])
def get_reorder_alerts():
    alerts = stock_service.check_reorder_alerts()
    return jsonify([a.model_dump() for a in alerts])


@app.route("/stock/summary", methods=["GET"])
def get_stock_summary():
    summary = stock_service.get_stock_summary()
    return jsonify([s.model_dump() for s in summary])


if __name__ == "__main__":
    app.run(debug=True, port=5000)
