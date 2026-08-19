# Expected Findings — Exercise 004: Large Code Review

This document is the answer key for the exercise. It lists all intentionally seeded issues, their locations, expected reasoning, and detection requirements.

**Total seeded issues: 14**

---

## ISSUE-01: Hard-coded admin API key

**Severity:** Critical
**Difficulty:** Easy
**Category:** Security

### Location

`src/api/admin.py`, line 10

### Description

The admin API key is hard-coded directly in the source code:

```python
ADMIN_API_KEY = "sk_live_admin_9f8b7c6d5e4a3210_finance_tracker"
```

### Expected reasoning

Any reviewer should recognize that credentials embedded in source code will be committed to version control and visible to anyone with repository access. The `sk_live_` prefix suggests this is a production key.

### Impact

If this code is pushed to a repository (even a private one), the admin API key is exposed. An attacker with the key gains full access to admin reporting endpoints that expose user data.

### Expected fix

Load the key from an environment variable or secrets manager. Use `os.environ.get("ADMIN_API_KEY")` and fail if not configured.

### Detection requirements

- Requires examining unchanged code: No
- Visible directly in the new file

---

## ISSUE-02: SQL injection in admin reporting endpoint

**Severity:** Critical
**Difficulty:** Medium
**Category:** Security

### Location

`src/api/admin.py`, function `user_activity_report()`, lines ~57-70

### Description

The `start_date`, `end_date`, and `sort_by` query parameters are inserted into the SQL query using Python f-string formatting instead of parameterized queries:

```python
query = f"""
    ...
    AND t.date >= '{start_date}' AND t.date <= '{end_date}'
    ...
    ORDER BY {sort_by} DESC
"""
db.execute(query)
```

### Expected reasoning

All other database queries in the application use parameterized queries (`?` placeholders). This endpoint uses string interpolation, which allows SQL injection. The `sort_by` parameter is particularly dangerous as it's injected without quotes, allowing arbitrary SQL.

### Impact

An attacker with admin access (or who has obtained the hard-coded admin key from ISSUE-01) could extract arbitrary data from the database, modify data, or potentially achieve remote code execution depending on the SQLite configuration.

### Expected fix

Use parameterized queries for `start_date` and `end_date`. For `sort_by`, validate against an allowlist of permitted column names.

### Detection requirements

- Requires examining unchanged code: Partially (comparing to parameterized query patterns used elsewhere)
- The vulnerability is visible in the new file, but recognizing it as inconsistent requires knowing the project's patterns

---

## ISSUE-03: Sensitive information logged in notification service

**Severity:** High
**Difficulty:** Easy
**Category:** Security

### Location

`src/services/notification_service.py`, functions `check_and_notify_budget()` and `check_and_notify_large_transaction()`

### Description

The notification service logs webhook URLs, email addresses, user IDs, and financial amounts at INFO level:

```python
logger.info(
    f"Sending budget alert to webhook: {pref.webhook_url} "
    f"for user {user_id}, payload: {json.dumps(payload)}"
)
```

### Expected reasoning

Webhook URLs often contain authentication tokens. Email addresses are PII. Financial amounts combined with user IDs constitute sensitive personal data. INFO-level logs are typically retained long-term and may be accessible to operations staff or log aggregation systems.

### Impact

Sensitive user data (email, webhook secrets, financial information) is written to application logs. This violates data minimization principles and could lead to data exposure through log files.

### Expected fix

Log at DEBUG level without sensitive details, or redact URLs/emails. Log only the event type and anonymized identifiers.

### Detection requirements

- Requires examining unchanged code: No
- Visible directly in the new file

---

## ISSUE-04: Off-by-one error in transfer fee threshold

**Severity:** High
**Difficulty:** Hard
**Category:** Correctness

### Location

`src/services/transfer_service.py`, line ~52

### Description

The fee threshold check uses `>` (strictly greater than) instead of `>=` (greater than or equal to):

```python
if from_account.currency != to_account.currency or amount > TRANSFER_FEE_THRESHOLD:
    fee = amount * TRANSFER_FEE_PERCENTAGE
```

The `TRANSFER_FEE_THRESHOLD` is set to `10000.0`. A transfer of exactly $10,000 incorrectly avoids the fee.

### Expected reasoning

The configuration `TRANSFER_FEE_THRESHOLD = 10000.0` implies that transfers at or above this amount should incur a fee. Using `>` means the boundary value itself is excluded. This is a classic off-by-one / boundary condition error.

### Impact

Transfers of exactly the threshold amount ($10,000) avoid the fee that should be applied. Financial impact is small per transaction but represents incorrect business logic.

### Expected fix

Change `>` to `>=`:
```python
if from_account.currency != to_account.currency or amount >= TRANSFER_FEE_THRESHOLD:
```

### Detection requirements

- Requires examining unchanged code: Yes (must check `Config` class for threshold value and understand intent)
- Relevant context: `src/config.py`

---

## ISSUE-05: Missing authentication on recurring/upcoming endpoint

**Severity:** Critical
**Difficulty:** Medium
**Category:** Authorization

### Location

`src/api/recurring.py`, function `list_upcoming()`, approximately line 120

### Description

The `/api/recurring/upcoming` endpoint lacks the `@require_auth` decorator:

```python
@recurring_bp.route("/upcoming", methods=["GET"])
def list_upcoming():
```

All other endpoints in this file and across the application use `@require_auth`.

### Expected reasoning

A reviewer comparing this endpoint to all other endpoints in the same file should notice the missing decorator. The function queries `recurring_transactions` without filtering by user, exposing all users' recurring transaction schedules.

### Impact

Any unauthenticated user can access all recurring transaction schedules in the system, including amounts, descriptions, and account IDs. This is an information disclosure vulnerability.

### Expected fix

Add `@require_auth` decorator and filter the query by `request.user_id`.

### Detection requirements

- Requires examining unchanged code: Yes (must compare with patterns in other endpoints)
- Relevant context: All other route definitions in `src/api/recurring.py` and other API files

---

## ISSUE-06: Breaking API contract — changed error return format

**Severity:** High
**Difficulty:** Hard
**Category:** API / Regression

### Location

`src/services/transaction_service.py`, function `create_transaction()`, error path approximately line 62

### Description

The error return for "account not found" was changed from:

```python
return None, ["Account not found or access denied"]
```

to:

```python
return {"status": "error", "account_id": account_id}, ["Account not found or access denied"]
```

### Expected reasoning

The function signature implies it returns `(Transaction | None, list)`. Returning a dict instead of None on error breaks callers that check `if transaction is None`. The `recurring_service.py` calls `create_transaction` and the API handler now includes special-case handling (`isinstance(transaction, dict)`) suggesting the developer knew it was a problem but patched it inconsistently.

### Impact

- The `recurring_service.py` processes recurring transactions and checks `if transaction:` — a non-empty dict is truthy, so it proceeds as if success
- Any future caller that checks for `None` on failure will behave incorrectly
- Inconsistent API contract makes the codebase harder to maintain

### Expected fix

Keep the original return contract: return `None` on error. If additional metadata is needed, add it to the errors list or use a separate mechanism.

### Detection requirements

- Requires examining unchanged code: Yes (must understand how callers use the return value)
- Relevant context: `src/services/recurring_service.py`, `src/api/transactions.py`

---

## ISSUE-07: Race condition in transfer service

**Severity:** Medium
**Difficulty:** Hard
**Category:** Concurrency

### Location

`src/services/transfer_service.py`, function `execute_transfer()`, lines ~45-65

### Description

The transfer reads both account balances, calculates new values, then writes them back in separate operations without any transaction isolation or locking:

```python
from_account = get_account_by_id(from_account_id, user_id)  # READ
to_account = get_account_by_id(to_account_id, user_id)      # READ
# ... calculations ...
update_account_balance(from_account_id, user_id, new_from_balance)  # WRITE
update_account_balance(to_account_id, user_id, new_to_balance)      # WRITE
```

### Expected reasoning

Between the reads and writes, another concurrent request could modify the same accounts. This is a classic TOCTOU (Time Of Check to Time Of Use) race condition. While SQLite has limited concurrency, the pattern would be dangerous with any other database backend.

### Impact

Concurrent transfers could result in incorrect balances — money could be created or lost. With SQLite this is partially mitigated by database-level locking, but the code pattern is dangerous and would be a critical bug with PostgreSQL or MySQL.

### Expected fix

Wrap the entire operation in a database transaction with appropriate isolation level. Use `SELECT ... FOR UPDATE` or equivalent locking mechanism.

### Detection requirements

- Requires examining unchanged code: Yes (must understand `update_account_balance` and `get_account_by_id` each use separate `db.commit()` calls)
- Relevant context: `src/services/account_service.py`

---

## ISSUE-08: N+1 query in recurring transaction processing

**Severity:** Medium
**Difficulty:** Medium
**Category:** Performance

### Location

`src/services/recurring_service.py`, function `process_due_recurring()`, approximately line 85

### Description

For each due recurring transaction, the service calls `get_account_by_id()` individually:

```python
for row in rows:
    recurring = RecurringTransaction.from_row(row)
    # ...
    account = get_account_by_id(recurring.account_id, recurring.user_id)
```

### Expected reasoning

If there are N due recurring transactions, this executes N+1 queries (1 to fetch all recurring transactions, then N individual account lookups). This could be replaced with a single JOIN query or a batch lookup.

### Impact

Performance degrades linearly with the number of recurring transactions. With hundreds of recurring transactions processing simultaneously, this creates unnecessary database load.

### Expected fix

Use a JOIN in the initial query to include account data, or batch-load all needed accounts before the loop.

### Detection requirements

- Requires examining unchanged code: Partially (need to see that `get_account_by_id` makes an individual DB query)
- Relevant context: `src/services/account_service.py`

---

## ISSUE-09: Swallowed exception in bulk import

**Severity:** High
**Difficulty:** Easy
**Category:** Correctness

### Location

`src/services/bulk_import_service.py`, approximately line 68

### Description

The CSV import catches all exceptions with a bare `except Exception` and continues processing:

```python
except Exception:
    skipped.append({"row": row_num, "reason": "Parse error"})
    continue
```

### Expected reasoning

This catches everything including database errors, connection failures, and programming errors. A database constraint violation or connection timeout will be silently treated as a "parse error" and the import will continue with potentially corrupt state.

### Impact

- Data integrity issues go unreported
- Partial imports succeed silently when they should fail completely
- Debugging becomes extremely difficult since errors are swallowed
- A single corrupt row could mask a systemic problem (e.g., database full)

### Expected fix

Catch only expected parsing exceptions (`ValueError`, `KeyError`). Let unexpected exceptions propagate. Consider wrapping the entire import in a transaction that rolls back on unexpected errors.

### Detection requirements

- Requires examining unchanged code: No
- Visible directly in the new file

---

## ISSUE-10: Incorrect monthly date calculation at month boundaries

**Severity:** Medium
**Difficulty:** Medium
**Category:** Correctness

### Location

`src/models/recurring.py`, function `calculate_next_date()`, monthly branch approximately line 95

### Description

The monthly calculation naively increments the month and keeps the same day:

```python
elif self.frequency == "monthly":
    month = from_date.month + 1
    year = from_date.year
    if month > 12:
        month = 1
        year += 1
    next_date = date(year, month, from_date.day)
    return next_date.isoformat()
```

This fails for dates like January 31 (February has no 31st day), March 31 (April has 30 days), etc.

### Expected reasoning

`date(2024, 2, 31)` raises a `ValueError`. The code will crash at runtime for any recurring transaction scheduled on the 29th, 30th, or 31st when the next month has fewer days. Note that the `yearly` frequency correctly uses `relativedelta` which handles this, making the monthly implementation inconsistently incorrect.

### Impact

Recurring transactions scheduled for the 29th–31st of a month will crash during processing, preventing all subsequent recurring transactions from being processed in the same batch.

### Expected fix

Use `relativedelta(months=1)` (already imported) or clamp the day to the last day of the target month.

### Detection requirements

- Requires examining unchanged code: Partially (need to notice that `relativedelta` is imported and used for yearly but not monthly)
- The bug is visible in the new file if reviewer considers edge cases

---

## ISSUE-11: Test mocks away the actual bug

**Severity:** Medium
**Difficulty:** Easy
**Category:** Testing

### Location

`tests/unit/test_recurring_service.py`, class `TestCalculateNextDate`, method `test_monthly_handles_end_of_month`

### Description

The test for monthly end-of-month handling uses `@patch.object` to mock `calculate_next_date` itself:

```python
@patch.object(RecurringTransaction, 'calculate_next_date')
def test_monthly_handles_end_of_month(self, mock_calc):
    mock_calc.return_value = "2024-02-29"
    # ...
    result = recurring.calculate_next_date("2024-01-31")
    assert result == "2024-02-29"
```

The test passes because it's asserting against the mock's return value, not the actual implementation.

### Expected reasoning

Mocking the function under test means the test never exercises the real code. This test gives false confidence that month boundaries are handled correctly when they are not (see ISSUE-10).

### Impact

The test suite appears to validate month-boundary handling but actually validates nothing. The real bug (ISSUE-10) goes undetected.

### Expected fix

Remove the mock and test the actual `calculate_next_date` method. The test should then fail, revealing ISSUE-10.

### Detection requirements

- Requires examining unchanged code: No
- Visible directly in the new test file (requires understanding what `@patch.object` does)

---

## ISSUE-12: Duplicated notification sending logic

**Severity:** Low
**Difficulty:** Easy
**Category:** Maintainability

### Location

`src/services/notification_service.py`, functions `check_and_notify_budget()` and `check_and_notify_large_transaction()`

### Description

Both functions contain nearly identical logic for iterating over preferences, checking thresholds, and dispatching via webhook or email. The code pattern is:

```python
for row in prefs:
    pref = NotificationPreference.from_row(row)
    threshold = pref.threshold or <default>
    if <condition> >= threshold:
        payload = {...}
        if pref.channel == "webhook" and pref.webhook_url:
            _send_webhook(pref.webhook_url, payload)
        elif pref.channel == "email" and pref.email_address:
            _send_email(pref.email_address, subject, payload)
```

This pattern appears twice with only the payload and condition differing.

### Expected reasoning

Duplicated code means any fix (such as fixing the logging issue in ISSUE-03) must be applied in multiple places. If a new notification channel is added, both functions must be updated.

### Impact

Maintenance burden. Higher chance of inconsistent behavior between notification types.

### Expected fix

Extract a common `_dispatch_notification(prefs, payload, subject)` helper function.

### Detection requirements

- Requires examining unchanged code: No
- Visible directly in the new file by comparing the two functions

---

## ISSUE-13: Changed default sort order without documentation

**Severity:** High
**Difficulty:** Hard
**Category:** API / Regression

### Location

`src/services/transaction_service.py`, function `get_transactions_for_user()`, approximately line 18

### Description

The sort order was changed from `ORDER BY date DESC, id DESC` to `ORDER BY date ASC, id ASC`:

```python
query += " ORDER BY date ASC, id ASC LIMIT ? OFFSET ?"
```

### Expected reasoning

The original behavior returned most-recent transactions first (DESC). Clients relying on this ordering (such as displaying "latest transactions" on a dashboard) will now receive oldest transactions first. This is a silent behavioral change with no API version bump or documentation.

### Impact

Any frontend or consumer that assumes most-recent-first ordering will display stale data. Pagination will appear broken — page 1 shows ancient transactions instead of recent ones.

### Expected fix

Restore `ORDER BY date DESC, id DESC` or make sort order configurable via a query parameter. If the change is intentional, document it as a breaking change.

### Detection requirements

- Requires examining unchanged code: Yes (must compare with original sort order in the baseline)
- Relevant context: The original `src/services/transaction_service.py` before the patch

---

## ISSUE-14: Bulk import bypasses amount validation

**Severity:** Medium
**Difficulty:** Medium
**Category:** Correctness

### Location

`src/services/bulk_import_service.py`, approximately line 55

### Description

The bulk import service inserts transactions directly into the database without validating that amounts are positive:

```python
amount = float(row.get("amount", 0))
# ... no check that amount > 0 ...
db.execute(
    """INSERT INTO transactions ... VALUES (?, ?, ?, ?, ?, ?, ?)""",
    (account_id, user_id, amount, txn_type, ...),
)
```

The `Transaction` model's `validate()` method requires `amount > 0`, but the bulk import bypasses it.

### Expected reasoning

The regular `create_transaction` flow validates via `Transaction.validate()`. The bulk import inserts directly to the database for performance, but skips this validation. Negative or zero amounts in a CSV will be silently imported, causing incorrect balance calculations.

### Impact

- Negative amounts corrupt account balances
- Zero-amount transactions pollute data
- Inconsistency between single-create and bulk-create paths

### Expected fix

Add explicit validation: `if amount <= 0: skipped.append(...)`. Or construct a `Transaction` object and call `validate()` before inserting.

### Detection requirements

- Requires examining unchanged code: Yes (must understand that `Transaction.validate()` enforces positive amounts)
- Relevant context: `src/models/transaction.py`

---

## Intentionally Correct Code (Expected False Positives)

The following items may appear suspicious but are actually correct. An ideal reviewer should investigate before flagging them.

### FP-1: Transfer fee of exactly 0.5%

`TRANSFER_FEE_PERCENTAGE = 0.005` in `src/services/transfer_service.py` and `Config` class.

This looks like a magic number but is intentional business logic for cross-currency transfer fees. It's consistently defined in both locations.

### FP-2: `max_occurrences = None` in recurring model

A `None` value for `max_occurrences` means "unlimited recurring" (no cap). This is documented behavior, not a potential infinite loop.

### FP-3: Admin endpoint uses different response format

The admin endpoints return `{"report": "...", "data": [...]}` instead of the standard `format_success_response()` wrapper. This is intentional — admin tooling has different format requirements than the user-facing API.

---

## Summary Table

| Issue ID | Category | Severity | Difficulty | File | Requires Unchanged Code |
|----------|----------|----------|------------|------|------------------------|
| ISSUE-01 | Security | Critical | Easy | `src/api/admin.py` | No |
| ISSUE-02 | Security | Critical | Medium | `src/api/admin.py` | Partially |
| ISSUE-03 | Security | High | Easy | `src/services/notification_service.py` | No |
| ISSUE-04 | Correctness | High | Hard | `src/services/transfer_service.py` | Yes |
| ISSUE-05 | Authorization | Critical | Medium | `src/api/recurring.py` | Yes |
| ISSUE-06 | Regression | High | Hard | `src/services/transaction_service.py` | Yes |
| ISSUE-07 | Concurrency | Medium | Hard | `src/services/transfer_service.py` | Yes |
| ISSUE-08 | Performance | Medium | Medium | `src/services/recurring_service.py` | Partially |
| ISSUE-09 | Correctness | High | Easy | `src/services/bulk_import_service.py` | No |
| ISSUE-10 | Correctness | Medium | Medium | `src/models/recurring.py` | Partially |
| ISSUE-11 | Testing | Medium | Easy | `tests/unit/test_recurring_service.py` | No |
| ISSUE-12 | Maintainability | Low | Easy | `src/services/notification_service.py` | No |
| ISSUE-13 | Regression | High | Hard | `src/services/transaction_service.py` | Yes |
| ISSUE-14 | Correctness | Medium | Medium | `src/services/bulk_import_service.py` | Yes |

### By Severity

- **Critical:** 3 (ISSUE-01, ISSUE-02, ISSUE-05)
- **High:** 5 (ISSUE-03, ISSUE-04, ISSUE-06, ISSUE-09, ISSUE-13)
- **Medium:** 5 (ISSUE-07, ISSUE-08, ISSUE-10, ISSUE-11, ISSUE-14)
- **Low:** 1 (ISSUE-12)

### By Difficulty

- **Easy:** 5 (ISSUE-01, ISSUE-03, ISSUE-09, ISSUE-11, ISSUE-12)
- **Medium:** 5 (ISSUE-02, ISSUE-05, ISSUE-08, ISSUE-10, ISSUE-14)
- **Hard:** 4 (ISSUE-04, ISSUE-06, ISSUE-07, ISSUE-13)

### By Detection Requirement

- **Diff-only (no unchanged code needed):** 6 (ISSUE-01, ISSUE-03, ISSUE-09, ISSUE-10*, ISSUE-11, ISSUE-12)
- **Requires understanding unchanged code:** 8 (ISSUE-02*, ISSUE-04, ISSUE-05, ISSUE-06, ISSUE-07, ISSUE-08*, ISSUE-13, ISSUE-14)

*Partially — visible in diff but full understanding requires context
