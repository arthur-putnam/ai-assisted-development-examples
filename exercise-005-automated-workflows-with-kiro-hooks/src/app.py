from flask import Flask

from src.api.users import users_bp
from src.api.products import products_bp
from src.api.orders import orders_bp


def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)

    app.register_blueprint(users_bp)
    app.register_blueprint(products_bp)
    app.register_blueprint(orders_bp)

    @app.route("/health", methods=["GET"])
    def health():
        return {"status": "ok"}, 200

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000)
