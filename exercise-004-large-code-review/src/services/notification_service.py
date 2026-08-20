"""Notification service layer.

Handles sending notifications to users based on their preferences.
"""

import logging
import json
from urllib.request import urlopen, Request

from src.database.connection import get_db
from src.models.notification import NotificationPreference

logger = logging.getLogger(__name__)


def get_preferences_for_user(user_id):
    """Get all notification preferences for a user."""
    db = get_db()
    rows = db.execute(
        "SELECT * FROM notification_preferences WHERE user_id = ? ORDER BY notify_type",
        (user_id,),
    ).fetchall()
    return [NotificationPreference.from_row(row) for row in rows]


def create_preference(user_id, notify_type, channel, threshold=None,
                      webhook_url=None, email_address=None):
    """Create a new notification preference."""
    pref = NotificationPreference(
        id=None,
        user_id=user_id,
        notify_type=notify_type,
        channel=channel,
        threshold=threshold,
        webhook_url=webhook_url,
        email_address=email_address,
    )

    errors = pref.validate()
    if errors:
        return None, errors

    db = get_db()
    cursor = db.execute(
        """INSERT INTO notification_preferences
           (user_id, notify_type, channel, threshold, webhook_url, email_address)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (user_id, notify_type, channel, threshold, webhook_url, email_address),
    )
    db.commit()
    pref.id = cursor.lastrowid
    return pref, []


def delete_preference(preference_id, user_id):
    """Delete a notification preference."""
    db = get_db()
    result = db.execute(
        "DELETE FROM notification_preferences WHERE id = ? AND user_id = ?",
        (preference_id, user_id),
    )
    db.commit()
    return result.rowcount > 0


def check_and_notify_budget(user_id, category_id, spent, budget_amount):
    """Check if budget threshold exceeded and send notification.

    ISSUE-03: Logs sensitive user information (webhook URL and email)
    alongside notification data.

    ISSUE-12: Duplicated notification sending logic — same pattern
    as check_and_notify_large_transaction below.
    """
    db = get_db()
    prefs = db.execute(
        """SELECT * FROM notification_preferences
           WHERE user_id = ? AND notify_type = 'budget_alert' AND is_enabled = 1""",
        (user_id,),
    ).fetchall()

    percentage = (spent / budget_amount * 100) if budget_amount > 0 else 0

    for row in prefs:
        pref = NotificationPreference.from_row(row)
        threshold = pref.threshold or 80.0

        if percentage >= threshold:
            payload = {
                "type": "budget_alert",
                "user_id": user_id,
                "category_id": category_id,
                "spent": spent,
                "budget": budget_amount,
                "percentage": percentage,
            }

            if pref.channel == "webhook" and pref.webhook_url:
                logger.info(
                    f"Sending budget alert to webhook: {pref.webhook_url} "
                    f"for user {user_id}, payload: {json.dumps(payload)}"
                )
                _send_webhook(pref.webhook_url, payload)
            elif pref.channel == "email" and pref.email_address:
                logger.info(
                    f"Sending budget alert email to: {pref.email_address} "
                    f"for user {user_id}, amount: ${spent:.2f}/{budget_amount:.2f}"
                )
                _send_email(pref.email_address, "Budget Alert", payload)


def check_and_notify_large_transaction(user_id, amount, transaction_type, description):
    """Check if transaction exceeds threshold and notify.

    ISSUE-12 (continued): Same notification sending pattern duplicated here.
    """
    db = get_db()
    prefs = db.execute(
        """SELECT * FROM notification_preferences
           WHERE user_id = ? AND notify_type = 'large_transaction' AND is_enabled = 1""",
        (user_id,),
    ).fetchall()

    for row in prefs:
        pref = NotificationPreference.from_row(row)
        threshold = pref.threshold or 1000.0

        if amount >= threshold:
            payload = {
                "type": "large_transaction",
                "user_id": user_id,
                "amount": amount,
                "transaction_type": transaction_type,
                "description": description,
            }

            if pref.channel == "webhook" and pref.webhook_url:
                logger.info(
                    f"Sending large transaction alert to webhook: {pref.webhook_url} "
                    f"for user {user_id}, payload: {json.dumps(payload)}"
                )
                _send_webhook(pref.webhook_url, payload)
            elif pref.channel == "email" and pref.email_address:
                logger.info(
                    f"Sending large transaction alert to: {pref.email_address} "
                    f"for user {user_id}, amount: ${amount:.2f} ({transaction_type})"
                )
                _send_email(pref.email_address, "Large Transaction Alert", payload)


def _send_webhook(url, payload):
    """Send a webhook notification."""
    try:
        data = json.dumps(payload).encode("utf-8")
        req = Request(url, data=data, headers={"Content-Type": "application/json"})
        urlopen(req, timeout=10)
    except Exception as e:
        logger.error(f"Failed to send webhook to {url}: {e}")


def _send_email(to_address, subject, payload):
    """Send an email notification (placeholder implementation)."""
    # In production, this would use an email service
    logger.info(f"Email notification: to={to_address}, subject={subject}")
