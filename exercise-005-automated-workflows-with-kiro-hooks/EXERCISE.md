# Kiro Hooks: Automated Development Workflows

## Learning Objectives

After completing this exercise, you should be able to:

1. Explain how Kiro Hooks connect development events to automated agent actions.
2. Distinguish between deterministic automation and agentic automation.
3. Configure a Hook that performs context-aware reasoning before acting.
4. Verify whether automated changes are correct rather than blindly trusting them.
5. Identify other engineering workflows that benefit from event-driven agent automation.

---

## Scenario

You maintain a Flask REST API with three resources (Users, Products, Orders). The API has comprehensive documentation in `docs/api.md` that must stay synchronized with the implementation.

The problem: developers frequently modify API routes, add parameters, or change response shapes — then forget to update documentation. This leads to stale docs that mislead API consumers.

Your goal is to experience this problem firsthand, then solve it with a Kiro Hook.

---

## Part 1 — Experience the Manual Workflow

### Step 1: Verify the baseline

Run the test suite to confirm everything passes:

```bash
pytest
```

Open `docs/api.md` and confirm it accurately describes the current endpoints.

### Step 2: Make an API change without automation

**Temporarily rename or remove the hook file** so it does not fire during this part:

```bash
# Disable the hook temporarily
mv .kiro/hooks/sync-api-docs.json .kiro/hooks/sync-api-docs.json.disabled
```

Now open `src/api/orders.py` and add an optional `status` query parameter to `GET /api/orders`:

```python
@orders_bp.route("/api/orders", methods=["GET"])
def list_orders():
    """List all orders. Optionally filter by user_id and status."""
    user_id = request.args.get("user_id")
    status = request.args.get("status")
    orders = order_service.list_orders(user_id=user_id)
    if status:
        orders = [o for o in orders if o.status == status]
    return jsonify([asdict(o) for o in orders]), 200
```

Save the file.

### Step 3: Observe the gap

Ask yourself:

> What else needs to change because you modified this endpoint?

Open `docs/api.md` and look at the `GET /api/orders` section.

**Observation:** The documentation still says the only query parameter is `user_id`. It does not mention the new `status` filter. The docs are now stale.

In a real project, this gap might not be caught until an API consumer reads outdated documentation and builds incorrect client code.

### Step 4: Revert your change

```bash
git checkout -- src/api/orders.py
```

---

## Part 2 — Inspect the Kiro Hook

### Step 1: Re-enable the Hook

```bash
mv .kiro/hooks/sync-api-docs.json.disabled .kiro/hooks/sync-api-docs.json
```

### Step 2: Read the Hook configuration

Open `.kiro/hooks/sync-api-docs.json` and examine the structure:

```json
{
  "version": "v1",
  "hooks": [
    {
      "name": "Sync API Documentation",
      "trigger": "PostFileSave",
      "matcher": "src[\\\\/]api[\\\\/].*\\.py$",
      "action": {
        "type": "agent",
        "prompt": "..."
      }
    }
  ]
}
```

Notice:

- **Trigger:** `PostFileSave` — runs after a file is saved in the IDE.
- **Matcher:** Regex that matches files under `src/api/` ending in `.py`.
- **Action type:** `agent` — injects a prompt into the model context rather than running a shell command.
- **Prompt:** Instructs the agent to compare the saved API file against `docs/api.md` and determine whether the public contract changed.

### Step 3: Understand the reasoning requirement

The prompt explicitly distinguishes:

- **Public API changes** (routes, parameters, request bodies, response structures, status codes) — documentation should update.
- **Internal changes** (variable renames, refactors, comments, optimizations) — documentation should NOT update.

This is what makes it *agentic* automation rather than *deterministic* automation. A shell script cannot make this judgment.

---

## Part 3 — Trigger the Automation (Public API Change)

### Scenario A: Add a query parameter

Open `src/api/orders.py` in Kiro and add the `status` filter to `GET /api/orders`:

```python
@orders_bp.route("/api/orders", methods=["GET"])
def list_orders():
    """List all orders. Optionally filter by user_id and status."""
    user_id = request.args.get("user_id")
    status = request.args.get("status")
    orders = order_service.list_orders(user_id=user_id)
    if status:
        orders = [o for o in orders if o.status == status]
    return jsonify([asdict(o) for o in orders]), 200
```

**Save the file.**

The Hook should trigger automatically. Observe Kiro's activity — it should:

1. Detect that `src/api/orders.py` was saved.
2. Analyze the change.
3. Determine that a new query parameter (`status`) was added to `GET /api/orders`.
4. Update `docs/api.md` to document the new parameter.

### Verify the result

```bash
git diff docs/api.md
```

You should see the `GET /api/orders` section now includes `status` in the query parameters table.

**Important:** Read the generated documentation. Does it accurately describe the parameter? Is the formatting consistent with the rest of the document?

---

## Part 4 — Test an Internal Refactor

### Scenario B: Extract helper logic without changing the API

Open `src/api/orders.py` and refactor the filtering logic into a helper function without changing the endpoint behavior:

```python
def _filter_orders(orders, user_id=None, status=None):
    """Filter orders by user_id and/or status."""
    if user_id:
        orders = [o for o in orders if o.user_id == user_id]
    if status:
        orders = [o for o in orders if o.status == status]
    return orders


@orders_bp.route("/api/orders", methods=["GET"])
def list_orders():
    """List all orders. Optionally filter by user_id and status."""
    user_id = request.args.get("user_id")
    status = request.args.get("status")
    orders = order_service.list_orders()
    orders = _filter_orders(orders, user_id=user_id, status=status)
    return jsonify([asdict(o) for o in orders]), 200
```

**Save the file.**

The Hook triggers again. This time, the agent should determine that the public API contract did NOT change (same routes, same parameters, same response shape) and leave `docs/api.md` unchanged.

### Verify

```bash
git diff docs/api.md
```

There should be no new changes to the documentation file. The agent correctly identified this as an internal refactor.

---

## Part 5 — Test Another API Contract Change

### Scenario C: Add a new endpoint

Open `src/api/orders.py` and add a new endpoint at the bottom of the file:

```python
@orders_bp.route("/api/orders/<order_id>/history", methods=["GET"])
def get_order_history(order_id):
    """Get the status history of an order."""
    order = order_service.get_order(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404
    history = [
        {"status": order.status, "timestamp": order.updated_at or order.created_at}
    ]
    return jsonify({"order_id": order_id, "history": history}), 200
```

**Save the file.**

The Hook should detect a new endpoint and add it to `docs/api.md`.

### Verify

```bash
git diff docs/api.md
```

A new section for `GET /api/orders/{order_id}/history` should appear in the documentation.

---

### Scenario D: Change a response structure

Open `src/api/orders.py` and modify the `get_order` endpoint to include a computed `item_count` field:

```python
@orders_bp.route("/api/orders/<order_id>", methods=["GET"])
def get_order(order_id):
    """Get a single order by ID."""
    order = order_service.get_order(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404
    result = asdict(order)
    result["item_count"] = len(order.items)
    return jsonify(result), 200
```

**Save the file.**

The Hook should detect the response schema change and update the documentation to reflect the new `item_count` field.

### Verify

```bash
git diff docs/api.md
```

---

## Verification Checklist

After each scenario, verify:

- [ ] What source code changed (`git diff src/`)
- [ ] Whether documentation changed (`git diff docs/`)
- [ ] Whether documentation *should* have changed (based on whether the public contract changed)
- [ ] Whether the generated documentation accurately reflects the code
- [ ] Whether the documentation style is consistent with existing sections

Run the test suite after each change to ensure nothing is broken:

```bash
pytest
```

---

## Deterministic vs. Agentic Automation

Traditional (deterministic) automation:

```
file changed → run formatter
file changed → run linter
file changed → rebuild
```

These are rule-based, predictable, and require no judgment. A shell script or CI pipeline handles them perfectly.

Agentic automation:

```
API file changed → understand semantic change → determine whether public behavior changed → decide whether documentation needs modification → make appropriate update
```

This requires understanding code semantics, comparing before/after behavior, and making a judgment call. A deterministic script cannot reliably make this decision.

**When to use each:**

| Use deterministic automation when... | Use agentic automation when... |
|--------------------------------------|-------------------------------|
| The task is fully specified by rules | The task requires judgment |
| Input → output mapping is predictable | Context determines the correct action |
| Correctness can be verified mechanically | A human would need to read and reason |
| Speed and reliability are paramount | Accuracy of interpretation matters |

The Hook in this exercise is valuable precisely because the decision "did the API contract change?" cannot be answered by a regex or diff alone. It requires understanding what constitutes a public interface.

---

## Reflection Questions

1. What repetitive human responsibility did the Hook remove?

2. Why is this better than simply regenerating the entire documentation file after every save?

3. What could go wrong if the agent incorrectly determines whether an API contract changed? (Consider both false positives and false negatives.)

4. Which parts of this workflow should still require human verification?

5. Would a deterministic script be better for any portion of this workflow? Which parts?

6. What other repository events would make good candidates for agent hooks?

7. When would a Hook become annoying or counterproductive?

8. How would the usefulness of this Hook change in a repository with hundreds of API endpoints?

---

## Optional Challenge: Create Your Own Hook

Ask Kiro to create a Hook for a different workflow. Here is a sample prompt you can try:

> Create a Kiro Hook that runs whenever files under `src/api/` are changed. The Hook should inspect the changed API implementation and determine whether the public API contract changed. If externally visible API behavior changed, update `docs/api.md` to match the implementation. Public API changes include routes, parameters, request bodies, response schemas, status codes, and externally visible behavior. Internal refactors should not cause documentation changes. Preserve the existing documentation style.

Compare the generated Hook against the reference Hook in `.kiro/hooks/sync-api-docs.json`.

### Design Your Own

Think of another workflow that would benefit from agentic automation. For each idea, identify:

| Element | Your Design |
|---------|-------------|
| **Trigger event** | What development activity starts the workflow? |
| **What the agent inspects** | What context does it need to reason about? |
| **Expected action** | What should the agent do when conditions are met? |
| **When to do nothing** | What should cause no action? |
| **Potential failure mode** | How could the agent get it wrong? |
| **Human verification** | How does a developer confirm correctness? |

Possible ideas:

- **Test maintenance:** Source implementation changes → agent evaluates whether tests need updating.
- **Architecture docs:** Module structure changes → agent updates architecture documentation.
- **Dependency review:** `requirements.txt` changes → agent summarizes potential impact.
- **Security review:** Authentication/authorization code changes → agent performs focused security review.

---

## Optional: Create the Hook from Scratch

If you want to practice writing Hooks rather than using the pre-built one:

1. Delete `.kiro/hooks/sync-api-docs.json`
2. Create a new file `.kiro/hooks/sync-api-docs.json`
3. Write the Hook configuration yourself using this structure:

```json
{
  "version": "v1",
  "hooks": [
    {
      "name": "<descriptive name>",
      "trigger": "<trigger event>",
      "matcher": "<regex matching relevant files>",
      "action": {
        "type": "agent",
        "prompt": "<instructions for the agent>"
      }
    }
  ]
}
```

Key decisions:
- Which trigger event to use?
- What regex matches API source files but not tests or models?
- What instructions help the agent distinguish public changes from internal ones?
- How do you tell the agent where documentation lives and what format to use?
