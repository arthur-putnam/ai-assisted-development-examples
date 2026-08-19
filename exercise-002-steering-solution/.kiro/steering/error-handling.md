# Error Handling Conventions

These conventions define how errors are handled and reported across the API.

## Standard Error Response

Every error response uses this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description of what went wrong"
  }
}
```

Never use `{"error": "message"}`, `{"message": "..."}`, or `{"detail": "..."}` formats.

## Validation Pattern

Validate input at the top of every route handler that accepts a request body:

```python
@app.route("/resources", methods=["POST"])
def create_resource():
    """Create a new resource."""
    data = request.get_json()

    # Always check for None/empty body first
    if not data:
        return jsonify({
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request body is required"
            }
        }), 400

    # Check required fields
    required_fields = ["title", "author_id"]
    missing = [f for f in required_fields if f not in data]
    if missing:
        return jsonify({
            "error": {
                "code": "MISSING_FIELD",
                "message": f"Required fields missing: {', '.join(missing)}"
            }
        }), 400

    # Validate field values
    if data.get("priority") and data["priority"] not in VALID_PRIORITIES:
        return jsonify({
            "error": {
                "code": "INVALID_VALUE",
                "message": f"priority must be one of: {VALID_PRIORITIES}"
            }
        }), 400

    # ... proceed with creation
```

## Error Code Reference

| Situation | Code | HTTP Status |
|-----------|------|-------------|
| Request body missing or empty | `VALIDATION_ERROR` | 400 |
| Required field not provided | `MISSING_FIELD` | 400 |
| Field value invalid (wrong type, out of range, bad format) | `INVALID_VALUE` | 400 |
| Resource not found (GET, PUT, DELETE by ID) | `RESOURCE_NOT_FOUND` | 404 |
| Duplicate resource (e.g., unique constraint violation) | `CONFLICT` | 409 |
| Cannot delete (has dependent resources) | `CONFLICT` | 409 |
| Referenced resource doesn't exist (e.g., bad foreign key) | `RESOURCE_NOT_FOUND` | 404 |

## Not Found Pattern

```python
resource = store.get(resource_id)
if not resource:
    return jsonify({
        "error": {
            "code": "RESOURCE_NOT_FOUND",
            "message": f"Task with id {resource_id} not found"
        }
    }), 404
```

Always include the resource type and identifier in the message.

## Delete Pattern

```python
@app.route("/resources/<int:resource_id>", methods=["DELETE"])
def delete_resource(resource_id):
    """Delete a resource by ID."""
    if resource_id not in store:
        return jsonify({
            "error": {
                "code": "RESOURCE_NOT_FOUND",
                "message": f"Resource with id {resource_id} not found"
            }
        }), 404

    del store[resource_id]
    return "", 204
```

Delete always returns 204 with no body on success. Never return a confirmation message in the body.

## Foreign Key Validation

When creating a resource that references another (e.g., a comment references a task and a user):

```python
# Validate referenced resources exist
task = tasks.get(task_id)
if not task:
    return jsonify({
        "error": {
            "code": "RESOURCE_NOT_FOUND",
            "message": f"Task with id {task_id} not found"
        }
    }), 404

user = users.get(data["author_id"])
if not user:
    return jsonify({
        "error": {
            "code": "RESOURCE_NOT_FOUND",
            "message": f"User with id {data['author_id']} not found"
        }
    }), 404
```

Always validate foreign keys before creating the resource, and return specific messages about which reference is invalid.
