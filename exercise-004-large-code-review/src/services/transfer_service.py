"""Transfer service for moving funds between accounts.

Handles account-to-account transfers with optional fees.
"""

import logging

from src.database.connection import get_db
from src.services.account_service import get_account_by_id, update_account_balance
from src.config import Config

logger = logging.getLogger(__name__)

# Transfer fee percentage (0.5% for cross-currency transfers)
TRANSFER_FEE_PERCENTAGE = 0.005
TRANSFER_FEE_THRESHOLD = 10000.0


def execute_transfer(user_id, from_account_id, to_account_id, amount, description=None):
    """Execute a transfer between two accounts.

    ISSUE-07: Race condition — reads balances then writes them without
    a database transaction or locking. Another request could modify the
    balance between the read and write.

    ISSUE-04: Off-by-one in fee threshold check — uses > instead of >=,
    meaning a transfer of exactly $10,000 incorrectly avoids the fee.
    """
    if amount <= 0:
        return None, ["Transfer amount must be positive"]

    # Verify both accounts belong to user
    from_account = get_account_by_id(from_account_id, user_id)
    if from_account is None:
        return None, ["Source account not found or access denied"]

    to_account = get_account_by_id(to_account_id, user_id)
    if to_account is None:
        return None, ["Destination account not found or access denied"]

    if from_account_id == to_account_id:
        return None, ["Cannot transfer to the same account"]

    # Calculate fee for cross-currency or large transfers
    fee = 0.0
    if from_account.currency != to_account.currency or amount > TRANSFER_FEE_THRESHOLD:
        fee = amount * TRANSFER_FEE_PERCENTAGE

    total_debit = amount + fee

    # Check sufficient balance (credit accounts can go negative)
    if from_account.account_type != "credit" and from_account.balance < total_debit:
        return None, ["Insufficient balance for transfer"]

    # Execute the transfer
    new_from_balance = from_account.balance - total_debit
    new_to_balance = to_account.balance + amount

    update_account_balance(from_account_id, user_id, new_from_balance)
    update_account_balance(to_account_id, user_id, new_to_balance)

    # Record the transfer as two transactions
    db = get_db()
    db.execute(
        """INSERT INTO transactions (account_id, user_id, amount, transaction_type, description, date)
           VALUES (?, ?, ?, 'transfer', ?, date('now'))""",
        (from_account_id, user_id, amount, f"Transfer to {to_account.name}: {description or ''}"),
    )
    db.execute(
        """INSERT INTO transactions (account_id, user_id, amount, transaction_type, description, date)
           VALUES (?, ?, ?, 'transfer', ?, date('now'))""",
        (to_account_id, user_id, amount, f"Transfer from {from_account.name}: {description or ''}"),
    )
    db.commit()

    result = {
        "from_account_id": from_account_id,
        "to_account_id": to_account_id,
        "amount": amount,
        "fee": fee,
        "total_debited": total_debit,
        "description": description,
    }

    logger.info(f"Transfer completed: user={user_id}, amount={amount}, fee={fee}")
    return result, []
