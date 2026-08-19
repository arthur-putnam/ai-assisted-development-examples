"""Account model."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class Account:
    """Represents a financial account."""

    id: Optional[int]
    user_id: int
    name: str
    account_type: str
    balance: float
    currency: str = "USD"
    is_active: bool = True
    created_at: Optional[str] = None

    VALID_TYPES = ("checking", "savings", "credit", "investment")

    def to_dict(self):
        """Convert account to dictionary."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "account_type": self.account_type,
            "balance": self.balance,
            "currency": self.currency,
            "is_active": self.is_active,
            "created_at": self.created_at,
        }

    @classmethod
    def from_row(cls, row):
        """Create Account from database row."""
        return cls(
            id=row["id"],
            user_id=row["user_id"],
            name=row["name"],
            account_type=row["account_type"],
            balance=row["balance"],
            currency=row["currency"],
            is_active=bool(row["is_active"]),
            created_at=row["created_at"],
        )

    def validate(self):
        """Validate account data."""
        errors = []
        if not self.name or not self.name.strip():
            errors.append("Account name is required")
        if self.account_type not in self.VALID_TYPES:
            errors.append(f"Invalid account type. Must be one of: {self.VALID_TYPES}")
        if self.balance < 0 and self.account_type != "credit":
            errors.append("Balance cannot be negative for non-credit accounts")
        return errors
