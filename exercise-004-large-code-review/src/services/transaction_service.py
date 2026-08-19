"""Transaction service layer."""

from datetime import date

from src.database.connection import get_db
from src.models.transaction import Transaction
from src.services.account_service import get_account_by_id, update_account_balance


def get_transactions_for_user(user_id, account_id=None, limit=20, offset=0):
    """Get transactions for a user with optional filtering."""
    db = get_db()

    query = "SELECT * FROM transactions WHERE user_id = ?"
    params = [user_id]

    if account_id:
        query += " AND account_id = ?"
        params.append(account_id)

    query += " ORDER BY date DESC, id DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    rows = db.execute(query, params).fetchall()
    return [Transaction.from_row(row) for row in rows]


def get_transaction_by_id(transaction_id, user_id):
    """Get a specific transaction by ID."""
    db = get_db()
    row = db.execute(
        "SELECT * FROM transactions WHERE id = ? AND user_id = ?",
        (transaction_id, user_id),
    ).fetchone()
    if row:
        return Transaction.from_row(row)
    return None


def create_transaction(user_id, account_id, amount, transaction_type, description=None, category_id=None, txn_date=None):
    """Create a new transaction and update account balance."""
    # Verify account ownership
    account = get_account_by_id(account_id, user_id)
    if account is None:
        return None, ["Account not found or access denied"]

    if txn_date is None:
        txn_date = date.today().isoformat()

    transaction = Transaction(
        id=None,
        account_id=account_id,
        user_id=user_id,
        amount=amount,
        transaction_type=transaction_type,
        description=description,
        category_id=category_id,
        date=txn_date,
    )

    errors = transaction.validate()
    if errors:
        return None, errors

    # Calculate new balance
    if transaction_type == "income":
        new_balance = account.balance + amount
    elif transaction_type == "expense":
        new_balance = account.balance - amount
    else:
        new_balance = account.balance

    db = get_db()
    cursor = db.execute(
        """INSERT INTO transactions (account_id, user_id, amount, transaction_type, description, category_id, date)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (account_id, user_id, amount, transaction_type, description, category_id, txn_date),
    )
    transaction.id = cursor.lastrowid

    # Update account balance
    update_account_balance(account_id, user_id, new_balance)
    db.commit()

    return transaction, []


def delete_transaction(transaction_id, user_id):
    """Delete a transaction and reverse the balance change."""
    transaction = get_transaction_by_id(transaction_id, user_id)
    if transaction is None:
        return False

    account = get_account_by_id(transaction.account_id, user_id)
    if account is None:
        return False

    # Reverse balance change
    if transaction.transaction_type == "income":
        new_balance = account.balance - transaction.amount
    elif transaction.transaction_type == "expense":
        new_balance = account.balance + transaction.amount
    else:
        new_balance = account.balance

    db = get_db()
    db.execute("DELETE FROM transactions WHERE id = ? AND user_id = ?", (transaction_id, user_id))
    update_account_balance(transaction.account_id, user_id, new_balance)
    db.commit()
    return True


def get_spending_summary(user_id, start_date, end_date):
    """Get spending summary grouped by category for a date range."""
    db = get_db()
    rows = db.execute(
        """SELECT c.name as category_name, c.id as category_id,
                  SUM(t.amount) as total, COUNT(t.id) as count
           FROM transactions t
           LEFT JOIN categories c ON t.category_id = c.id
           WHERE t.user_id = ? AND t.date >= ? AND t.date <= ?
                 AND t.transaction_type = 'expense'
           GROUP BY c.id
           ORDER BY total DESC""",
        (user_id, start_date, end_date),
    ).fetchall()
    return [dict(row) for row in rows]
