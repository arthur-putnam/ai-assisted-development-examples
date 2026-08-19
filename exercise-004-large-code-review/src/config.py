"""Application configuration."""

import os


class Config:
    """Base configuration."""

    DATABASE_PATH = os.environ.get("DATABASE_PATH", "finance_tracker.db")
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")
    TOKEN_EXPIRY_HOURS = 24
    MAX_PAGE_SIZE = 100
    DEFAULT_PAGE_SIZE = 20


class TestConfig(Config):
    """Test configuration."""

    DATABASE_PATH = ":memory:"
    SECRET_KEY = "test-secret-key"
