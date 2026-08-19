"""Transaction model."""

from dataclasses import dataclass
from typing import Optional
from dateutil import parser as date_parser


@dataclass
class Transaction:
    """Represents a financial transaction."""

    id: Optional[int]
    account_id: int
    user_id: int
    amount: float
    transaction_type: str
    description: Optional[str] = None
    category_id: Optional[int] = None
    date: Optional[str] = None
    created_at: Optional[str] = None

    VALID_TYPES = ("income", "expense", "transfer")

    def to_dict(self):
        """Convert transaction to dictionary."""
        return {
            "id": self.id,
            "account_id": self.account_id,
            "user_id": self.user_id,
            "amount": self.amount,
            "transaction_type": self.transaction_type,
            "description": self.description,
            "category_id": self.category_id,
            "date": self.date,
            "created_at": self.created_at,
        }

    @classmethod
    def from_row(cls, row):
        """Create Transaction from database row."""
        return cls(
            id=row["id"],
            account_id=row["account_id"],
            user_id=row["user_id"],
            amount=row["amount"],
            transaction_type=row["transaction_type"],
            description=row["description"],
            category_id=row["category_id"],
            date=row["date"],
            created_at=row["created_at"],
        )

    def validate(self):
        """Validate transaction data."""
        errors = []
        if self.amount <= 0:
            errors.append("Amount must be positive")
        if self.transaction_type not in self.VALID_TYPES:
            errors.append(f"Invalid transaction type. Must be one of: {self.VALID_TYPES}")
        if self.date:
            try:
                date_parser.parse(self.date)
            except (ValueError, TypeError):
                errors.append("Invalid date format")
        return errors
