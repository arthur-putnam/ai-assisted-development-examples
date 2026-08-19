"""Budget model."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class Budget:
    """Represents a spending budget for a category."""

    id: Optional[int]
    user_id: int
    category_id: int
    amount: float
    period: str
    start_date: str
    end_date: Optional[str] = None
    created_at: Optional[str] = None

    VALID_PERIODS = ("weekly", "monthly", "yearly")

    def to_dict(self):
        """Convert budget to dictionary."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "category_id": self.category_id,
            "amount": self.amount,
            "period": self.period,
            "start_date": self.start_date,
            "end_date": self.end_date,
            "created_at": self.created_at,
        }

    @classmethod
    def from_row(cls, row):
        """Create Budget from database row."""
        return cls(
            id=row["id"],
            user_id=row["user_id"],
            category_id=row["category_id"],
            amount=row["amount"],
            period=row["period"],
            start_date=row["start_date"],
            end_date=row["end_date"],
            created_at=row["created_at"],
        )

    def validate(self):
        """Validate budget data."""
        errors = []
        if self.amount <= 0:
            errors.append("Budget amount must be positive")
        if self.period not in self.VALID_PERIODS:
            errors.append(f"Invalid period. Must be one of: {self.VALID_PERIODS}")
        if not self.start_date:
            errors.append("Start date is required")
        return errors
