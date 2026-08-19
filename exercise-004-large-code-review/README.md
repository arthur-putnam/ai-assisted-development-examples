# Personal Finance Tracker API

A REST API for managing personal finances including accounts, transactions, budgets, and categories. Built with Python, Flask, and SQLite.

## Overview

This application provides:

- **Accounts** — Track checking, savings, credit, and investment accounts
- **Transactions** — Record income, expenses, and transfers with automatic balance updates
- **Categories** — Organize transactions by type (groceries, utilities, salary, etc.)
- **Budgets** — Set spending limits per category with progress tracking
- **Authentication** — Token-based auth with per-user data isolation

## Prerequisites

- Python 3.8+
- pip

## Setup

```bash
cd exercise-004-large-code-review
pip install -r requirements.txt
```

## Running the Application

```bash
python -m flask --app src.app:create_app run
```

The API will be available at `http://localhost:5000`.

## Running Tests

```bash
python -m pytest tests/ -v
```

To run with coverage:

```bash
python -m pytest tests/ --cov=src --cov-report=term-missing
```

## API Endpoints

All endpoints (except `/health`) require a `Bearer` token in the `Authorization` header.

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |

### Accounts

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/accounts` | List all accounts |
| GET | `/api/accounts/<id>` | Get account details |
| POST | `/api/accounts` | Create an account |
| DELETE | `/api/accounts/<id>` | Deactivate an account |

### Transactions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/transactions` | List transactions (paginated) |
| GET | `/api/transactions/<id>` | Get transaction details |
| POST | `/api/transactions` | Create a transaction |
| DELETE | `/api/transactions/<id>` | Delete a transaction |
| GET | `/api/transactions/summary` | Spending summary by category |

### Budgets

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/budgets` | List all budgets |
| GET | `/api/budgets/<id>` | Get budget details |
| GET | `/api/budgets/<id>/status` | Get budget progress |
| POST | `/api/budgets` | Create a budget |
| DELETE | `/api/budgets/<id>` | Delete a budget |

### Categories

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/categories` | List all categories |
| GET | `/api/categories/<id>` | Get category details |
| POST | `/api/categories` | Create a category |
| DELETE | `/api/categories/<id>` | Delete a category |

## Project Structure

```
src/
├── app.py              # Flask application factory
├── config.py           # Configuration
├── api/                # Route handlers
│   ├── accounts.py
│   ├── budgets.py
│   ├── categories.py
│   └── transactions.py
├── auth/               # Authentication
│   ├── middleware.py   # @require_auth decorator
│   └── service.py      # Token generation/validation, user management
├── database/           # Database layer
│   ├── connection.py   # SQLite connection management
│   └── migrations.py   # Schema initialization
├── models/             # Data models
│   ├── account.py
│   ├── budget.py
│   ├── category.py
│   └── transaction.py
├── services/           # Business logic
│   ├── account_service.py
│   ├── budget_service.py
│   ├── category_service.py
│   └── transaction_service.py
└── utils/              # Shared utilities
    ├── formatting.py   # Response formatting helpers
    └── validators.py   # Input validation

tests/
├── conftest.py         # Shared fixtures
├── unit/               # Service and utility tests
└── integration/        # Full API endpoint tests
```

## Design Decisions

- **SQLite** — Zero configuration, no external database needed
- **Flask** — Lightweight, well-known, minimal boilerplate
- **Service layer** — Business logic separated from route handlers
- **Token auth** — Simple HMAC-based tokens (not JWT) for minimal dependencies
- **Dataclass models** — Type-safe data representations with validation
