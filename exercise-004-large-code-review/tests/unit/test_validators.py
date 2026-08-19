"""Tests for input validation utilities."""

import pytest
from src.utils.validators import (
    validate_email,
    validate_date_string,
    validate_positive_number,
    validate_pagination,
    sanitize_string,
)


class TestValidateEmail:
    def test_valid_email(self):
        assert validate_email("user@example.com") is True

    def test_valid_email_with_plus(self):
        assert validate_email("user+tag@example.com") is True

    def test_invalid_email_no_at(self):
        assert validate_email("userexample.com") is False

    def test_invalid_email_no_domain(self):
        assert validate_email("user@") is False

    def test_empty_email(self):
        assert validate_email("") is False

    def test_none_email(self):
        assert validate_email(None) is False


class TestValidateDateString:
    def test_valid_date(self):
        assert validate_date_string("2024-01-15") is True

    def test_valid_leap_year(self):
        assert validate_date_string("2024-02-29") is True

    def test_invalid_leap_year(self):
        assert validate_date_string("2023-02-29") is False

    def test_invalid_format(self):
        assert validate_date_string("01-15-2024") is False

    def test_invalid_date(self):
        assert validate_date_string("2024-13-01") is False

    def test_empty_string(self):
        assert validate_date_string("") is False

    def test_none(self):
        assert validate_date_string(None) is False


class TestValidatePositiveNumber:
    def test_positive_int(self):
        assert validate_positive_number(5) is True

    def test_positive_float(self):
        assert validate_positive_number(3.14) is True

    def test_zero(self):
        assert validate_positive_number(0) is False

    def test_negative(self):
        assert validate_positive_number(-1) is False

    def test_string_number(self):
        assert validate_positive_number("42") is True

    def test_invalid_string(self):
        assert validate_positive_number("abc") is False

    def test_none(self):
        assert validate_positive_number(None) is False


class TestValidatePagination:
    def test_default_values(self):
        page, page_size, offset = validate_pagination(None, None)
        assert page == 1
        assert page_size == 20
        assert offset == 0

    def test_valid_values(self):
        page, page_size, offset = validate_pagination(3, 10)
        assert page == 3
        assert page_size == 10
        assert offset == 20

    def test_exceeds_max_page_size(self):
        page, page_size, offset = validate_pagination(1, 500)
        assert page_size == 100

    def test_negative_page(self):
        page, page_size, offset = validate_pagination(-1, 10)
        assert page == 1
        assert offset == 0

    def test_string_values(self):
        page, page_size, offset = validate_pagination("2", "15")
        assert page == 2
        assert page_size == 15
        assert offset == 15


class TestSanitizeString:
    def test_normal_string(self):
        assert sanitize_string("hello world") == "hello world"

    def test_strips_whitespace(self):
        assert sanitize_string("  hello  ") == "hello"

    def test_truncates_long_string(self):
        long_str = "a" * 600
        result = sanitize_string(long_str)
        assert len(result) == 500

    def test_none_returns_none(self):
        assert sanitize_string(None) is None

    def test_custom_max_length(self):
        result = sanitize_string("hello world", max_length=5)
        assert result == "hello"
