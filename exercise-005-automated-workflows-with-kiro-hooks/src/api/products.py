from dataclasses import asdict

from flask import Blueprint, jsonify, request

from src.services.product_service import ProductService

products_bp = Blueprint("products", __name__)
product_service = ProductService()


@products_bp.route("/api/products", methods=["GET"])
def list_products():
    """List all products. Optionally filter by category."""
    category = request.args.get("category")
    products = product_service.list_products(category=category)
    return jsonify([asdict(p) for p in products]), 200


@products_bp.route("/api/products/<product_id>", methods=["GET"])
def get_product(product_id):
    """Get a single product by ID."""
    product = product_service.get_product(product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    return jsonify(asdict(product)), 200


@products_bp.route("/api/products", methods=["POST"])
def create_product():
    """Create a new product."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400
    required = ["name", "description", "price"]
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({"error": f"Missing required fields: {missing}"}), 400
    product = product_service.create_product(
        name=data["name"],
        description=data["description"],
        price=data["price"],
        stock=data.get("stock", 0),
        category=data.get("category"),
    )
    return jsonify(asdict(product)), 201


@products_bp.route("/api/products/<product_id>", methods=["PUT"])
def update_product(product_id):
    """Update an existing product."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400
    product = product_service.update_product(product_id, **data)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    return jsonify(asdict(product)), 200


@products_bp.route("/api/products/<product_id>", methods=["DELETE"])
def delete_product(product_id):
    """Delete a product."""
    deleted = product_service.delete_product(product_id)
    if not deleted:
        return jsonify({"error": "Product not found"}), 404
    return "", 204
