"""Bulk import service for importing transactions from CSV files."""

import csv
import io
import logging
from datetime import date

from src.database.connection import get_db
from src.services.account_service import get_account_by_id

logger = logging.getLogger(__name__)


def import_transactions_csv(user_id, account_id, csv_content):
    """Import transactions from CSV content.

    Expected CSV columns: date, amount, type, description, category_id

    ISSUE-09: Swallowed exception — catches generic Exception and continues,
    meaning data corruption or partial imports happen silently.

    ISSUE-14: Does not validate that amounts are positive before inserting,
    bypassing the model's validation logic. Negative amounts in CSV will
    be inserted directly, potentially causing incorrect balance calculations.
    """
    account = get_account_by_id(account_id, user_id)
    if account is None:
        return None, ["Account not found or access denied"]

    reader = csv.DictReader(io.StringIO(csv_content))
    imported = []
    skipped = []
    balance_adjustment = 0.0

    for row_num, row in enumerate(reader, start=1):
        try:
            txn_date = row.get("date", "").strip()
            amount = float(row.get("amount", 0))
            txn_type = row.get("type", "").strip().lower()
            description = row.get("description", "").strip()
            category_id = row.get("category_id", "").strip() or None

            # Basic validation
            if not txn_date:
                skipped.append({"row": row_num, "reason": "Missing date"})
                continue

            if txn_type not in ("income", "expense", "transfer"):
                skipped.append({"row": row_num, "reason": f"Invalid type: {txn_type}"})
                continue

            if category_id:
                category_id = int(category_id)

            # Insert transaction directly
            db = get_db()
            db.execute(
                """INSERT INTO transactions
                   (account_id, user_id, amount, transaction_type, description, category_id, date)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (account_id, user_id, amount, txn_type, description, category_id, txn_date),
            )

            # Track balance adjustment
            if txn_type == "income":
                balance_adjustment += amount
            elif txn_type == "expense":
                balance_adjustment -= amount

            imported.append({"row": row_num, "amount": amount, "type": txn_type})

        except Exception:
            # Skip problematic rows
            skipped.append({"row": row_num, "reason": "Parse error"})
            continue

    # Update account balance
    if balance_adjustment != 0:
        db = get_db()
        new_balance = account.balance + balance_adjustment
        db.execute(
            "UPDATE accounts SET balance = ? WHERE id = ? AND user_id = ?",
            (new_balance, account_id, user_id),
        )
        db.commit()

    return {
        "imported_count": len(imported),
        "skipped_count": len(skipped),
        "skipped_rows": skipped,
        "balance_adjustment": balance_adjustment,
    }, []
