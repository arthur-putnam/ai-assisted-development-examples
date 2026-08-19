"""Flask application factory."""

from flask import Flask

from src.config import Config
from src.database.connection import get_db, close_db
from src.database.migrations import init_db
from src.api.accounts import accounts_bp
from src.api.transactions import transactions_bp
from src.api.budgets import budgets_bp
from src.api.categories import categories_bp


def create_app(config=None):
    """Create and configure the Flask application."""
    app = Flask(__name__)

    if config:
        app.config.from_object(config)
    else:
        app.config.from_object(Config)

    # Register teardown
    app.teardown_appcontext(close_db)

    # Initialize database
    with app.app_context():
        init_db()

    # Register blueprints
    app.register_blueprint(accounts_bp, url_prefix="/api/accounts")
    app.register_blueprint(transactions_bp, url_prefix="/api/transactions")
    app.register_blueprint(budgets_bp, url_prefix="/api/budgets")
    app.register_blueprint(categories_bp, url_prefix="/api/categories")

    @app.route("/health")
    def health():
        return {"status": "healthy"}

    return app
