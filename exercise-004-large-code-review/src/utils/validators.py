"""Input validation utilities."""

import re
from datetime import date


def validate_email(email):
    """Validate email format."""
    if not email:
        return False
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return re.match(pattern, email) is not None


def validate_date_string(date_str):
    """Validate a date string in YYYY-MM-DD format."""
    if not date_str:
        return False
    try:
        parts = date_str.split("-")
        if len(parts) != 3:
            return False
        year, month, day = int(parts[0]), int(parts[1]), int(parts[2])
        date(year, month, day)
        return True
    except (ValueError, TypeError):
        return False


def validate_positive_number(value):
    """Validate that a value is a positive number."""
    try:
        num = float(value)
        return num > 0
    except (ValueError, TypeError):
        return False


def validate_pagination(page, page_size, max_page_size=100):
    """Validate and normalize pagination parameters."""
    try:
        page = max(1, int(page))
    except (ValueError, TypeError):
        page = 1

    try:
        page_size = min(max(1, int(page_size)), max_page_size)
    except (ValueError, TypeError):
        page_size = 20

    offset = (page - 1) * page_size
    return page, page_size, offset


def sanitize_string(value, max_length=500):
    """Sanitize a string input."""
    if value is None:
        return None
    value = str(value).strip()
    if len(value) > max_length:
        value = value[:max_length]
    return value
