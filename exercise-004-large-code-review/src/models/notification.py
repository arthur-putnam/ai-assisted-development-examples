"""Notification preference model."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class NotificationPreference:
    """Represents user notification preferences."""

    id: Optional[int]
    user_id: int
    notify_type: str
    channel: str
    threshold: Optional[float] = None
    webhook_url: Optional[str] = None
    email_address: Optional[str] = None
    is_enabled: bool = True
    created_at: Optional[str] = None

    VALID_TYPES = ("budget_alert", "large_transaction", "recurring_processed", "weekly_summary")
    VALID_CHANNELS = ("email", "webhook")

    def to_dict(self):
        """Convert to dictionary."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "notify_type": self.notify_type,
            "channel": self.channel,
            "threshold": self.threshold,
            "webhook_url": self.webhook_url,
            "email_address": self.email_address,
            "is_enabled": self.is_enabled,
            "created_at": self.created_at,
        }

    @classmethod
    def from_row(cls, row):
        """Create NotificationPreference from database row."""
        return cls(
            id=row["id"],
            user_id=row["user_id"],
            notify_type=row["notify_type"],
            channel=row["channel"],
            threshold=row["threshold"],
            webhook_url=row["webhook_url"],
            email_address=row["email_address"],
            is_enabled=bool(row["is_enabled"]),
            created_at=row["created_at"],
        )

    def validate(self):
        """Validate notification preference data."""
        errors = []
        if self.notify_type not in self.VALID_TYPES:
            errors.append(f"Invalid notify_type. Must be one of: {self.VALID_TYPES}")
        if self.channel not in self.VALID_CHANNELS:
            errors.append(f"Invalid channel. Must be one of: {self.VALID_CHANNELS}")
        if self.channel == "webhook" and not self.webhook_url:
            errors.append("webhook_url is required for webhook channel")
        if self.channel == "email" and not self.email_address:
            errors.append("email_address is required for email channel")
        if self.notify_type == "large_transaction" and self.threshold is None:
            errors.append("threshold is required for large_transaction alerts")
        return errors
