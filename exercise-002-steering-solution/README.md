# Steering Example 1 — Solution (Enhanced)

## Scenario: Adding Features to a Task Management API

Same codebase as the problem version — a partially-built task management API with inconsistent patterns. But this time, `.kiro/steering/` files provide clear conventions for the agent to follow.

Your job: **ask the agent to add the same "comments" feature**. Observe how the steering overrides the codebase's inconsistencies and produces uniform, standards-compliant output.

## The Project

Same Flask API code as the problem version (deliberately inconsistent). The difference is the `.kiro/steering/` directory:

```
.kiro/
└── steering/
    ├── api-conventions.md          # REST API standards (responses, status codes, naming)
    ├── code-style.md               # Python code conventions (patterns, docstrings, typing)
    └── error-handling.md           # Error handling patterns and validation rules
```

## What's in the Steering Files

### api-conventions.md
- Standard response envelope format for all endpoints
- Correct HTTP status codes for each operation type
- JSON field naming conventions (always `snake_case`)
- Pagination format for list endpoints
- URL path conventions

### code-style.md
- Model class patterns (use Pydantic, method naming)
- Function and variable naming (always `snake_case`)
- Docstring format (Google style)
- Import ordering
- File organization

### error-handling.md
- Standard error response format: `{"error": {"code": "...", "message": "..."}}`
- Input validation pattern (validate early, return specific errors)
- Status code mapping for each error type
- How to handle not-found, conflict, and validation errors

## What to Try

Open this project in Kiro and ask the agent the same thing as the problem version:

1. "Add a comments feature to the tasks API. Users should be able to add a comment to a task, list all comments on a task, and delete a comment."

## Expected Observations

With steering active, the agent will:

- **Follow the documented error format** consistently (the structured `{"error": {...}}` format)
- **Use correct status codes** (201 for creation, 204 for deletion)
- **Apply snake_case everywhere** in JSON responses
- **Add proper validation** following the documented pattern
- **Include docstrings** in Google style on all functions
- **Use Pydantic models** for the Comment data class
- **Name methods consistently** (`to_dict()` on all models)

Even though the existing code is inconsistent, the agent follows the steering rather than mimicking the existing mess.

## Compare With

See [`../exercise-002-steering-problem/`](../exercise-002-steering-problem/) for the version without steering. The difference in the agent's output quality and consistency is the entire point of steering.
