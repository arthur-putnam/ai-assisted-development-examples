"""Category model."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class Category:
    """Represents a transaction category."""

    id: Optional[int]
    user_id: int
    name: str
    category_type: str
    color: str = "#6B7280"
    created_at: Optional[str] = None

    VALID_TYPES = ("income", "expense")

    def to_dict(self):
        """Convert category to dictionary."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "category_type": self.category_type,
            "color": self.color,
            "created_at": self.created_at,
        }

    @classmethod
    def from_row(cls, row):
        """Create Category from database row."""
        return cls(
            id=row["id"],
            user_id=row["user_id"],
            name=row["name"],
            category_type=row["category_type"],
            color=row["color"],
            created_at=row["created_at"],
        )

    def validate(self):
        """Validate category data."""
        errors = []
        if not self.name or not self.name.strip():
            errors.append("Category name is required")
        if self.category_type not in self.VALID_TYPES:
            errors.append(f"Invalid category type. Must be one of: {self.VALID_TYPES}")
        return errors
