# Exercise 005 — Automated Workflows with Kiro Hooks

## What Are Kiro Hooks?

Kiro Hooks are event-driven automations that trigger agent actions in response to development activity. They connect IDE events (file saves, file creates, session starts, tool usage) to agent instructions that execute automatically.

Hook configurations live in `.kiro/hooks/` and follow a JSON format specifying:

- **Trigger** — the event type (e.g., `PostFileSave`, `PostFileCreate`, `PreToolUse`)
- **Matcher** — an optional regex that filters which specific events fire the hook
- **Action** — what to do when triggered (run a shell command or inject agent instructions)

## Problem Statement

In this exercise, developers frequently modify REST API endpoints but forget to update the corresponding API documentation (`docs/api.md`). This creates stale documentation that misleads consumers.

Maintaining documentation manually is tedious and error-prone. However, a simple "regenerate docs on every save" approach is wasteful — internal refactors should not trigger documentation changes.

The ideal automation must **reason about whether the public API contract changed** before deciding to update documentation. This is a task that requires judgment, making it a good fit for an agent hook rather than a deterministic script.

## Application Overview

A Flask REST API with three resources:

| Resource | Endpoints | Description |
|----------|-----------|-------------|
| Users    | 5         | CRUD operations for user accounts |
| Products | 5         | CRUD operations for product catalog |
| Orders   | 5         | Order management with status transitions |

Total: 15 endpoints (including health check).

## Project Structure

```
exercise-005-automated-workflows-with-kiro-hooks/
├── .kiro/
│   └── hooks/
│       └── sync-api-docs.json       # The Kiro Hook configuration
├── src/
│   ├── api/
│   │   ├── users.py                 # User endpoints
│   │   ├── products.py              # Product endpoints
│   │   └── orders.py                # Order endpoints
│   ├── models/
│   │   ├── user.py                  # User dataclass
│   │   ├── product.py               # Product dataclass
│   │   └── order.py                 # Order/OrderItem dataclasses
│   ├── services/
│   │   ├── user_service.py          # User business logic
│   │   ├── product_service.py       # Product business logic
│   │   └── order_service.py         # Order business logic
│   └── app.py                       # Flask application factory
├── docs/
│   └── api.md                       # API documentation (the artifact kept in sync)
├── tests/
│   ├── conftest.py                  # Test fixtures
│   ├── test_health.py
│   ├── test_users.py
│   ├── test_products.py
│   └── test_orders.py
├── .exercise/
│   └── instructor/
│       └── expected-behavior.md     # Expected outcomes for each scenario
├── requirements.txt
├── README.md
└── EXERCISE.md                      # Student activity instructions
```

## Prerequisites

- Python 3.10+
- pip
- A coding agent with Kiro Hook support (Kiro IDE)
- Git (for verifying changes)

## Setup

```bash
cd exercise-005-automated-workflows-with-kiro-hooks
python -m venv .venv

# Activate the virtual environment
# Linux/macOS:
source .venv/bin/activate
# Windows:
.venv\Scripts\activate

pip install -r requirements.txt
```

## Running the Application

```bash
python -m src.app
```

The API will be available at `http://localhost:5000`.

## Running Tests

```bash
pytest
```

All tests should pass in the baseline state.

## Starting the Exercise

Open `EXERCISE.md` for the full student activity.

## Where the Hook Lives

The Kiro Hook configuration is at:

```
.kiro/hooks/sync-api-docs.json
```

It watches for saves to files matching `src/api/*.py` and instructs the agent to evaluate whether the public API contract changed. If it did, the agent updates `docs/api.md` accordingly.
