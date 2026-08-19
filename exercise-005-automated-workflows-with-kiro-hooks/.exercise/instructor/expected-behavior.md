# Expected Behavior — Instructor Reference

## Scenario Results

| Scenario | Source Change | Public API Change? | docs/api.md Should Change? | Expected Documentation Update |
|----------|-------------|-------------------|---------------------------|-------------------------------|
| A | Add `status` query parameter to `GET /api/orders` | Yes | Yes | New row in query parameters table: `status \| string \| No \| Filter orders by status` |
| B | Extract filtering into `_filter_orders()` helper | No | No | No modification — internal refactor only |
| C | Add `GET /api/orders/{order_id}/history` endpoint | Yes | Yes | New section documenting the endpoint, path params, and response shape |
| D | Add `item_count` field to `GET /api/orders/{order_id}` response | Yes | Yes | Response example updated to include `"item_count": <integer>` |

## Detailed Expected Outcomes

### Scenario A — New Query Parameter

The `GET /api/orders` query parameters table should change from:

| Parameter | Type   | Required | Description               |
|-----------|--------|----------|---------------------------|
| user_id   | string | No       | Filter orders by user ID  |

To:

| Parameter | Type   | Required | Description               |
|-----------|--------|----------|---------------------------|
| user_id   | string | No       | Filter orders by user ID  |
| status    | string | No       | Filter orders by status   |

The endpoint description should also update to mention the new filter.

### Scenario B — Internal Refactor

No documentation changes should occur. The agent should recognize that:
- The route did not change
- Query parameters did not change
- Response structure did not change
- Only internal implementation organization changed

If the agent incorrectly modifies documentation for this scenario, it indicates the Hook prompt needs refinement to better distinguish public from private changes.

### Scenario C — New Endpoint

A new section should be added to docs/api.md for:

```
### GET /api/orders/{order_id}/history
```

With:
- Path parameters table (order_id)
- Response example showing `{"order_id": "...", "history": [...]}`
- Error response for 404

### Scenario D — Response Schema Change

The `GET /api/orders/{order_id}` response example should include the new `item_count` field:

```json
{
  "id": "ord-001",
  "user_id": "usr-002",
  "items": [...],
  "status": "delivered",
  "total": 29.99,
  "created_at": "2025-03-15T10:30:00",
  "updated_at": null,
  "item_count": 2
}
```

## Common Student Observations

1. **Hook fires but produces no change for Scenario B** — This is correct behavior. Students sometimes think the Hook "failed" when it correctly determined no update was needed.

2. **Documentation style varies from existing** — The agent may not perfectly match the existing formatting. This is a good discussion point about automation vs. human polish.

3. **Agent adds too much or too little** — The prompt quality directly affects output quality. Discuss how prompt engineering applies to Hooks.

## Key Takeaways for Discussion

- Hooks are most valuable when the trigger-to-action mapping requires reasoning.
- The "do nothing" case (Scenario B) is as important as the "do something" cases.
- Human verification remains essential — automation reduces toil but does not eliminate responsibility.
- The same Hook can produce different quality output depending on the underlying model.
- Deterministic tools (linters, formatters, type checkers) should handle tasks that can be precisely specified. Reserve agentic hooks for judgment-dependent workflows.
