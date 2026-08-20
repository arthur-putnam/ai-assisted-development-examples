"""Flask application factory."""

from flask import Flask

from src.config import Config
from src.database.connection import get_db, close_db
from src.database.migrations import init_db
from src.api.accounts import accounts_bp
from src.api.transactions import transactions_bp
from src.api.budgets import budgets_bp
from src.api.categories import categories_bp
from src.api.recurring import recurring_bp
from src.api.notifications import notifications_bp
from src.api.transfers import transfers_bp
from src.api.bulk import bulk_bp
from src.api.admin import admin_bp


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
    app.register_blueprint(recurring_bp, url_prefix="/api/recurring")
    app.register_blueprint(notifications_bp, url_prefix="/api/notifications")
    app.register_blueprint(transfers_bp, url_prefix="/api/transfers")
    app.register_blueprint(bulk_bp, url_prefix="/api/bulk")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")

    @app.route("/health")
    def health():
        return {"status": "healthy"}

    return app
