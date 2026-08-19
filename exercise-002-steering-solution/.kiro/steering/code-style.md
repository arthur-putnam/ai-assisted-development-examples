# Code Style Conventions

These conventions apply to all Python code in this project. Follow these standards when writing new code, regardless of what existing code does. (The existing code has known inconsistencies that will be cleaned up incrementally.)

## Models

Use Pydantic `BaseModel` for all data models:

```python
from typing import Optional
from pydantic import BaseModel, Field


class Task(BaseModel):
    """Represents a task in the system.

    Attributes:
        id: Unique task identifier.
        title: Short description of the task.
        status: Current task status (todo, in_progress, done).
    """

    id: int
    title: str
    description: Optional[str] = None
    status: str = "todo"
    created_at: str
```

### Model rules

1. All models inherit from `BaseModel`.
2. Every model has a class docstring describing what it represents.
3. Use `Optional[Type] = None` for optional fields (not `Type | None`).
4. Serialization method is always named `to_dict()` and calls `self.model_dump()`.
5. Use `Field(...)` for validation constraints (min/max, regex, etc.).

## Functions

### Naming
- Functions and methods: `snake_case`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Private methods: prefix with underscore `_helper_method`

### Docstrings (Google style)

Every public function gets a docstring:

```python
def create_task(data: dict) -> Task:
    """Create a new task from the provided data.

    Args:
        data: Dictionary containing task fields. Must include 'title'.

    Returns:
        The newly created Task instance.

    Raises:
        ValueError: If required fields are missing.
        KeyError: If referenced resources don't exist.
    """
```

### Type hints

- All function parameters have type hints.
- All functions have return type annotations.
- Use `Optional[Type]` for parameters that can be None.

## Imports

Order imports in this sequence, separated by blank lines:

1. Standard library (`datetime`, `os`, `json`)
2. Third-party packages (`flask`, `pydantic`)
3. Local imports (`.models`, `.store`)

```python
import json
from datetime import datetime
from typing import Optional

from flask import Flask, jsonify, request
from pydantic import BaseModel

from .models import Task, User
from .store import tasks, users
```

## Route Handler Pattern

Every route handler follows this structure:

```python
@app.route("/resources", methods=["POST"])
def create_resource():
    """Create a new resource.

    Returns 201 with the created resource on success.
    Returns 400 if validation fails.
    """
    data = request.get_json()

    # 1. Validate input
    errors = validate_create_resource(data)
    if errors:
        return jsonify({"error": {"code": "VALIDATION_ERROR", "message": errors}}), 400

    # 2. Execute business logic
    resource = build_and_store_resource(data)

    # 3. Return response
    return jsonify(resource.to_dict()), 201
```

## File Organization

```
src/
├── __init__.py
├── app.py          # Flask app, route definitions
├── models.py       # Pydantic model classes
├── store.py        # Data access layer
└── validation.py   # Input validation helpers (if needed)
```

Keep route handlers thin — extract business logic into helper functions or a service module if handlers exceed ~20 lines.
