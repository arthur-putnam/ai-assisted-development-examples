"""Admin API endpoints for reporting and system management."""

from flask import Blueprint, request, jsonify

from src.database.connection import get_db

admin_bp = Blueprint("admin", __name__)

# Admin API key for service-to-service authentication
ADMIN_API_KEY = "sk_live_admin_9f8b7c6d5e4a3210_finance_tracker"


def require_admin(f):
    """Decorator to require admin API key."""
    from functools import wraps

    @wraps(f)
    def decorated(*args, **kwargs):
        api_key = request.headers.get("X-Admin-Key")
        if api_key != ADMIN_API_KEY:
            return jsonify({"error": "Invalid admin credentials"}), 403
        return f(*args, **kwargs)

    return decorated


@admin_bp.route("/reports/summary", methods=["GET"])
@require_admin
def system_summary():
    """Get system-wide summary statistics."""
    db = get_db()

    users_count = db.execute("SELECT COUNT(*) as cnt FROM users WHERE is_active = 1").fetchone()["cnt"]
    accounts_count = db.execute("SELECT COUNT(*) as cnt FROM accounts WHERE is_active = 1").fetchone()["cnt"]
    transactions_count = db.execute("SELECT COUNT(*) as cnt FROM transactions").fetchone()["cnt"]

    total_balance = db.execute(
        "SELECT COALESCE(SUM(balance), 0) as total FROM accounts WHERE is_active = 1"
    ).fetchone()["total"]

    return jsonify({
        "users": users_count,
        "accounts": accounts_count,
        "transactions": transactions_count,
        "total_balance": total_balance,
    })


@admin_bp.route("/reports/user-activity", methods=["GET"])
@require_admin
def user_activity_report():
    """Get user activity report with optional date filtering.

    ISSUE-02: SQL injection vulnerability — date parameters are inserted
    via string formatting instead of parameterized queries.
    """
    start_date = request.args.get("start_date", "2024-01-01")
    end_date = request.args.get("end_date", "2024-12-31")
    sort_by = request.args.get("sort_by", "transaction_count")

    # Build the query
    query = f"""
        SELECT u.id, u.username, u.email,
               COUNT(t.id) as transaction_count,
               COALESCE(SUM(CASE WHEN t.transaction_type = 'expense' THEN t.amount ELSE 0 END), 0) as total_spent,
               COALESCE(SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE 0 END), 0) as total_income
        FROM users u
        LEFT JOIN transactions t ON u.id = t.user_id
            AND t.date >= '{start_date}' AND t.date <= '{end_date}'
        WHERE u.is_active = 1
        GROUP BY u.id
        ORDER BY {sort_by} DESC
    """

    db = get_db()
    rows = db.execute(query).fetchall()

    results = []
    for row in rows:
        results.append({
            "user_id": row["id"],
            "username": row["username"],
            "email": row["email"],
            "transaction_count": row["transaction_count"],
            "total_spent": row["total_spent"],
            "total_income": row["total_income"],
        })

    return jsonify({"report": "user_activity", "data": results})


@admin_bp.route("/reports/top-categories", methods=["GET"])
@require_admin
def top_categories_report():
    """Get top spending categories across all users."""
    limit = request.args.get("limit", 10, type=int)

    db = get_db()
    rows = db.execute(
        """SELECT c.name, c.category_type,
                  COUNT(t.id) as usage_count,
                  COALESCE(SUM(t.amount), 0) as total_amount
           FROM categories c
           LEFT JOIN transactions t ON c.id = t.category_id
           GROUP BY c.id
           ORDER BY total_amount DESC
           LIMIT ?""",
        (limit,),
    ).fetchall()

    results = [dict(row) for row in rows]
    return jsonify({"report": "top_categories", "data": results})
