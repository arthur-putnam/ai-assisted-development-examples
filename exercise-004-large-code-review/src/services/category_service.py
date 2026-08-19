"""Category service layer."""

from src.database.connection import get_db
from src.models.category import Category


def get_categories_for_user(user_id):
    """Get all categories for a user."""
    db = get_db()
    rows = db.execute(
        "SELECT * FROM categories WHERE user_id = ? ORDER BY name",
        (user_id,),
    ).fetchall()
    return [Category.from_row(row) for row in rows]


def get_category_by_id(category_id, user_id):
    """Get a specific category by ID."""
    db = get_db()
    row = db.execute(
        "SELECT * FROM categories WHERE id = ? AND user_id = ?",
        (category_id, user_id),
    ).fetchone()
    if row:
        return Category.from_row(row)
    return None


def create_category(user_id, name, category_type, color="#6B7280"):
    """Create a new category."""
    category = Category(
        id=None,
        user_id=user_id,
        name=name,
        category_type=category_type,
        color=color,
    )

    errors = category.validate()
    if errors:
        return None, errors

    db = get_db()
    try:
        cursor = db.execute(
            "INSERT INTO categories (user_id, name, category_type, color) VALUES (?, ?, ?, ?)",
            (user_id, name, category_type, color),
        )
        db.commit()
        category.id = cursor.lastrowid
        return category, []
    except Exception:
        db.rollback()
        return None, ["Category with this name already exists"]


def delete_category(category_id, user_id):
    """Delete a category if no transactions reference it."""
    db = get_db()

    # Check for existing transactions
    txn_count = db.execute(
        "SELECT COUNT(*) as cnt FROM transactions WHERE category_id = ? AND user_id = ?",
        (category_id, user_id),
    ).fetchone()["cnt"]

    if txn_count > 0:
        return False, "Cannot delete category with existing transactions"

    result = db.execute(
        "DELETE FROM categories WHERE id = ? AND user_id = ?",
        (category_id, user_id),
    )
    db.commit()
    if result.rowcount > 0:
        return True, None
    return False, "Category not found"
