"""Recurring transaction model."""

from dataclasses import dataclass
from typing import Optional
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta


@dataclass
class RecurringTransaction:
    """Represents a scheduled recurring transaction."""

    id: Optional[int]
    user_id: int
    account_id: int
    amount: float
    transaction_type: str
    description: Optional[str]
    category_id: Optional[int]
    frequency: str
    start_date: str
    next_date: str
    end_date: Optional[str] = None
    max_occurrences: Optional[int] = None
    occurrence_count: int = 0
    is_active: bool = True
    created_at: Optional[str] = None

    VALID_FREQUENCIES = ("daily", "weekly", "biweekly", "monthly", "yearly")

    def to_dict(self):
        """Convert to dictionary."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "account_id": self.account_id,
            "amount": self.amount,
            "transaction_type": self.transaction_type,
            "description": self.description,
            "category_id": self.category_id,
            "frequency": self.frequency,
            "start_date": self.start_date,
            "next_date": self.next_date,
            "end_date": self.end_date,
            "max_occurrences": self.max_occurrences,
            "occurrence_count": self.occurrence_count,
            "is_active": self.is_active,
            "created_at": self.created_at,
        }

    @classmethod
    def from_row(cls, row):
        """Create RecurringTransaction from database row."""
        return cls(
            id=row["id"],
            user_id=row["user_id"],
            account_id=row["account_id"],
            amount=row["amount"],
            transaction_type=row["transaction_type"],
            description=row["description"],
            category_id=row["category_id"],
            frequency=row["frequency"],
            start_date=row["start_date"],
            next_date=row["next_date"],
            end_date=row["end_date"],
            max_occurrences=row["max_occurrences"],
            occurrence_count=row["occurrence_count"],
            is_active=bool(row["is_active"]),
            created_at=row["created_at"],
        )

    def validate(self):
        """Validate recurring transaction data."""
        errors = []
        if self.amount <= 0:
            errors.append("Amount must be positive")
        if self.transaction_type not in ("income", "expense"):
            errors.append("transaction_type must be 'income' or 'expense'")
        if self.frequency not in self.VALID_FREQUENCIES:
            errors.append(f"Invalid frequency. Must be one of: {self.VALID_FREQUENCIES}")
        if not self.start_date:
            errors.append("start_date is required")
        return errors

    def calculate_next_date(self, from_date_str):
        """Calculate the next occurrence date from a given date.

        ISSUE-10: Monthly calculation doesn't handle month boundaries.
        For example, Jan 31 + 1 month should be Feb 28, but this uses
        a naive day replacement that can produce invalid dates.
        """
        from_date = date.fromisoformat(from_date_str)

        if self.frequency == "daily":
            return (from_date + timedelta(days=1)).isoformat()
        elif self.frequency == "weekly":
            return (from_date + timedelta(weeks=1)).isoformat()
        elif self.frequency == "biweekly":
            return (from_date + timedelta(weeks=2)).isoformat()
        elif self.frequency == "monthly":
            # Move to next month, keep same day
            month = from_date.month + 1
            year = from_date.year
            if month > 12:
                month = 1
                year += 1
            next_date = date(year, month, from_date.day)
            return next_date.isoformat()
        elif self.frequency == "yearly":
            return (from_date + relativedelta(years=1)).isoformat()

        return from_date_str
