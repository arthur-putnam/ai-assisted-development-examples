"""Budget service layer."""

from src.database.connection import get_db
from src.models.budget import Budget


def get_budgets_for_user(user_id):
    """Get all budgets for a user."""
    db = get_db()
    rows = db.execute(
        """SELECT b.*, c.name as category_name
           FROM budgets b
           JOIN categories c ON b.category_id = c.id
           WHERE b.user_id = ?
           ORDER BY b.created_at DESC""",
        (user_id,),
    ).fetchall()
    return [dict(row) for row in rows]


def get_budget_by_id(budget_id, user_id):
    """Get a specific budget by ID."""
    db = get_db()
    row = db.execute(
        "SELECT * FROM budgets WHERE id = ? AND user_id = ?",
        (budget_id, user_id),
    ).fetchone()
    if row:
        return Budget.from_row(row)
    return None


def create_budget(user_id, category_id, amount, period, start_date, end_date=None):
    """Create a new budget."""
    budget = Budget(
        id=None,
        user_id=user_id,
        category_id=category_id,
        amount=amount,
        period=period,
        start_date=start_date,
        end_date=end_date,
    )

    errors = budget.validate()
    if errors:
        return None, errors

    # Verify category belongs to user
    db = get_db()
    cat_row = db.execute(
        "SELECT id FROM categories WHERE id = ? AND user_id = ?",
        (category_id, user_id),
    ).fetchone()
    if cat_row is None:
        return None, ["Category not found or access denied"]

    cursor = db.execute(
        """INSERT INTO budgets (user_id, category_id, amount, period, start_date, end_date)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (user_id, category_id, amount, period, start_date, end_date),
    )
    db.commit()
    budget.id = cursor.lastrowid
    return budget, []


def get_budget_status(budget_id, user_id):
    """Get current spending vs budget amount."""
    budget = get_budget_by_id(budget_id, user_id)
    if budget is None:
        return None

    db = get_db()

    # Get total spending in the budget's category during the period
    query = """
        SELECT COALESCE(SUM(amount), 0) as spent
        FROM transactions
        WHERE user_id = ? AND category_id = ? AND transaction_type = 'expense'
              AND date >= ?
    """
    params = [user_id, budget.category_id, budget.start_date]

    if budget.end_date:
        query += " AND date <= ?"
        params.append(budget.end_date)

    row = db.execute(query, params).fetchone()
    spent = row["spent"] if row else 0.0

    return {
        "budget_id": budget.id,
        "category_id": budget.category_id,
        "budgeted": budget.amount,
        "spent": spent,
        "remaining": budget.amount - spent,
        "percentage_used": (spent / budget.amount * 100) if budget.amount > 0 else 0,
    }


def delete_budget(budget_id, user_id):
    """Delete a budget."""
    db = get_db()
    result = db.execute(
        "DELETE FROM budgets WHERE id = ? AND user_id = ?",
        (budget_id, user_id),
    )
    db.commit()
    return result.rowcount > 0
