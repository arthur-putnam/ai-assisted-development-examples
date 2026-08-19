"""Account service layer."""

from src.database.connection import get_db
from src.models.account import Account


def get_accounts_for_user(user_id):
    """Get all active accounts for a user."""
    db = get_db()
    rows = db.execute(
        "SELECT * FROM accounts WHERE user_id = ? AND is_active = 1 ORDER BY name",
        (user_id,),
    ).fetchall()
    return [Account.from_row(row) for row in rows]


def get_account_by_id(account_id, user_id):
    """Get a specific account by ID, verifying ownership."""
    db = get_db()
    row = db.execute(
        "SELECT * FROM accounts WHERE id = ? AND user_id = ? AND is_active = 1",
        (account_id, user_id),
    ).fetchone()
    if row:
        return Account.from_row(row)
    return None


def create_account(user_id, name, account_type, balance=0.0, currency="USD"):
    """Create a new account."""
    account = Account(
        id=None,
        user_id=user_id,
        name=name,
        account_type=account_type,
        balance=balance,
        currency=currency,
    )

    errors = account.validate()
    if errors:
        return None, errors

    db = get_db()
    cursor = db.execute(
        """INSERT INTO accounts (user_id, name, account_type, balance, currency)
           VALUES (?, ?, ?, ?, ?)""",
        (user_id, name, account_type, balance, currency),
    )
    db.commit()
    account.id = cursor.lastrowid
    return account, []


def update_account_balance(account_id, user_id, new_balance):
    """Update account balance."""
    db = get_db()
    db.execute(
        "UPDATE accounts SET balance = ? WHERE id = ? AND user_id = ?",
        (new_balance, account_id, user_id),
    )
    db.commit()


def deactivate_account(account_id, user_id):
    """Soft-delete an account."""
    db = get_db()
    result = db.execute(
        "UPDATE accounts SET is_active = 0 WHERE id = ? AND user_id = ?",
        (account_id, user_id),
    )
    db.commit()
    return result.rowcount > 0
