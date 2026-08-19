# API Conventions

These conventions apply to all REST API endpoints in this project. When adding new endpoints or modifying existing ones, follow these standards regardless of what the existing code does.

## Response Format

### Successful responses

Single resource:
```json
{
  "id": 1,
  "field_name": "value",
  "created_at": "2025-03-01T10:00:00Z"
}
```

List of resources:
```json
{
  "items": [...],
  "total": 42,
  "page": 1,
  "page_size": 20
}
```

For simple lists without pagination (fewer than 100 items expected), a plain array is acceptable:
```json
[
  {"id": 1, "field_name": "value"},
  {"id": 2, "field_name": "value"}
]
```

### Error responses

All errors use this format:
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Task with id 42 not found"
  }
}
```

Error codes are UPPER_SNAKE_CASE constants. Common codes:
- `RESOURCE_NOT_FOUND` — 404
- `VALIDATION_ERROR` — 400
- `CONFLICT` — 409
- `MISSING_FIELD` — 400
- `INVALID_VALUE` — 400
- `UNAUTHORIZED` — 401

## HTTP Status Codes

| Operation | Success Code | Notes |
|-----------|-------------|-------|
| GET single resource | 200 | |
| GET list | 200 | |
| POST (create) | 201 | Return the created resource |
| PUT (full update) | 200 | Return the updated resource |
| PATCH (partial update) | 200 | Return the updated resource |
| DELETE | 204 | No response body |

## JSON Naming Convention

All JSON fields use `snake_case`. Never use `camelCase` in API responses.

Examples:
- `created_at` (not `createdAt`)
- `assignee_id` (not `assigneeId`)
- `display_name` (not `displayName`)
- `due_date` (not `dueDate`)

## URL Conventions

- Use plural nouns for resources: `/tasks`, `/users`, `/comments`
- Nest child resources under parents: `/tasks/{task_id}/comments`
- Use path parameters for identifiers: `/tasks/{task_id}`
- Use query parameters for filtering: `/tasks?status=todo&priority=high`
- All paths are lowercase with hyphens for multi-word segments if needed

## Request Body Conventions

- POST and PUT requests accept JSON with `Content-Type: application/json`
- Field names in request bodies follow the same `snake_case` convention
- Optional fields can be omitted (not sent as null)
- Required fields that are missing trigger a `MISSING_FIELD` error

## Timestamps

- All timestamps are UTC in ISO 8601 format: `2025-03-01T10:00:00Z`
- The trailing `Z` is always present (never use offset notation)
- Fields: `created_at`, `updated_at`, `deleted_at`
