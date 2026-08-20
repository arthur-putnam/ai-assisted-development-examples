"""CSV reader for loading transaction data."""

import csv
import logging
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import List

from .models import Transaction, TransactionType

logger = logging.getLogger(__name__)

TYPE_MAP = {
    "debit": TransactionType.DEBIT,
    "credit": TransactionType.CREDIT,
    "transfer": TransactionType.TRANSFER,
    "reversal": TransactionType.REVERSAL,
}


def load_transactions(filepath: str) -> List[Transaction]:
    """Load transactions from a CSV file.

    Expected columns: id, account_id, amount, currency, type, timestamp,
                      description, counterparty, reference
    """
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"Transaction file not found: {filepath}")

    transactions = []
    errors = []

    with open(path, "r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row_num, row in enumerate(reader, start=2):
            try:
                txn = _parse_row(row, row_num)
                transactions.append(txn)
            except (ValueError, KeyError, InvalidOperation) as e:
                errors.append(f"Row {row_num}: {e}")

    if errors:
        logger.warning(f"Skipped {len(errors)} invalid rows in {filepath}")
        for err in errors[:5]:
            logger.warning(f"  {err}")

    logger.info(f"Loaded {len(transactions)} transactions from {filepath}")
    return transactions


def _parse_row(row: dict, row_num: int) -> Transaction:
    """Parse a single CSV row into a Transaction."""
    txn_type = row.get("type", "").lower().strip()
    if txn_type not in TYPE_MAP:
        raise ValueError(f"Invalid transaction type: '{txn_type}'")

    amount = Decimal(row["amount"].strip())
    if amount <= 0:
        raise ValueError(f"Invalid amount: {amount}")

    timestamp = datetime.fromisoformat(row["timestamp"].strip())

    return Transaction(
        id=row["id"].strip(),
        account_id=row["account_id"].strip(),
        amount=amount,
        currency=row["currency"].strip().upper(),
        type=TYPE_MAP[txn_type],
        timestamp=timestamp,
        description=row.get("description", "").strip(),
        counterparty=row.get("counterparty", "").strip() or None,
        reference=row.get("reference", "").strip() or None,
    )
