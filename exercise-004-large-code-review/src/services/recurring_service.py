"""Recurring transaction service layer."""

import logging
from datetime import date

from src.database.connection import get_db
from src.models.recurring import RecurringTransaction
from src.services.account_service import get_account_by_id
from src.services.transaction_service import create_transaction

logger = logging.getLogger(__name__)


def get_recurring_for_user(user_id):
    """Get all recurring transactions for a user."""
    db = get_db()
    rows = db.execute(
        "SELECT * FROM recurring_transactions WHERE user_id = ? ORDER BY next_date",
        (user_id,),
    ).fetchall()
    return [RecurringTransaction.from_row(row) for row in rows]


def get_recurring_by_id(recurring_id, user_id):
    """Get a specific recurring transaction."""
    db = get_db()
    row = db.execute(
        "SELECT * FROM recurring_transactions WHERE id = ? AND user_id = ?",
        (recurring_id, user_id),
    ).fetchone()
    if row:
        return RecurringTransaction.from_row(row)
    return None


def create_recurring(user_id, account_id, amount, transaction_type, frequency,
                     start_date, description=None, category_id=None,
                     end_date=None, max_occurrences=None):
    """Create a new recurring transaction schedule."""
    recurring = RecurringTransaction(
        id=None,
        user_id=user_id,
        account_id=account_id,
        amount=amount,
        transaction_type=transaction_type,
        description=description,
        category_id=category_id,
        frequency=frequency,
        start_date=start_date,
        next_date=start_date,
        end_date=end_date,
        max_occurrences=max_occurrences,
    )

    errors = recurring.validate()
    if errors:
        return None, errors

    # Verify account ownership
    account = get_account_by_id(account_id, user_id)
    if account is None:
        return None, ["Account not found or access denied"]

    db = get_db()
    cursor = db.execute(
        """INSERT INTO recurring_transactions
           (user_id, account_id, amount, transaction_type, description, category_id,
            frequency, start_date, next_date, end_date, max_occurrences)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (user_id, account_id, amount, transaction_type, description, category_id,
         frequency, start_date, start_date, end_date, max_occurrences),
    )
    db.commit()
    recurring.id = cursor.lastrowid
    return recurring, []


def process_due_recurring(user_id=None):
    """Process all recurring transactions that are due.

    ISSUE-08: N+1 query pattern - loads each account one at a time
    inside the loop instead of batch loading.
    """
    db = get_db()
    today = date.today().isoformat()

    query = """SELECT * FROM recurring_transactions
               WHERE is_active = 1 AND next_date <= ?"""
    params = [today]

    if user_id:
        query += " AND user_id = ?"
        params.append(user_id)

    rows = db.execute(query, params).fetchall()
    processed = []

    for row in rows:
        recurring = RecurringTransaction.from_row(row)

        # Check if max occurrences reached
        if recurring.max_occurrences and recurring.occurrence_count >= recurring.max_occurrences:
            db.execute(
                "UPDATE recurring_transactions SET is_active = 0 WHERE id = ?",
                (recurring.id,),
            )
            continue

        # Check end date
        if recurring.end_date and recurring.next_date > recurring.end_date:
            db.execute(
                "UPDATE recurring_transactions SET is_active = 0 WHERE id = ?",
                (recurring.id,),
            )
            continue

        # Verify account still exists and is active
        account = get_account_by_id(recurring.account_id, recurring.user_id)
        if account is None:
            logger.warning(f"Account {recurring.account_id} not found for recurring {recurring.id}")
            continue

        # Create the transaction
        transaction, errors = create_transaction(
            user_id=recurring.user_id,
            account_id=recurring.account_id,
            amount=recurring.amount,
            transaction_type=recurring.transaction_type,
            description=f"[Recurring] {recurring.description or ''}".strip(),
            category_id=recurring.category_id,
            txn_date=recurring.next_date,
        )

        if transaction:
            # Calculate next date
            next_date = recurring.calculate_next_date(recurring.next_date)
            new_count = recurring.occurrence_count + 1

            db.execute(
                """UPDATE recurring_transactions
                   SET next_date = ?, occurrence_count = ?
                   WHERE id = ?""",
                (next_date, new_count, recurring.id),
            )
            db.commit()
            processed.append(recurring.id)

    return processed


def pause_recurring(recurring_id, user_id):
    """Pause a recurring transaction."""
    db = get_db()
    result = db.execute(
        "UPDATE recurring_transactions SET is_active = 0 WHERE id = ? AND user_id = ?",
        (recurring_id, user_id),
    )
    db.commit()
    return result.rowcount > 0


def resume_recurring(recurring_id, user_id):
    """Resume a paused recurring transaction."""
    db = get_db()
    result = db.execute(
        "UPDATE recurring_transactions SET is_active = 1 WHERE id = ? AND user_id = ?",
        (recurring_id, user_id),
    )
    db.commit()
    return result.rowcount > 0


def delete_recurring(recurring_id, user_id):
    """Delete a recurring transaction."""
    db = get_db()
    result = db.execute(
        "DELETE FROM recurring_transactions WHERE id = ? AND user_id = ?",
        (recurring_id, user_id),
    )
    db.commit()
    return result.rowcount > 0
