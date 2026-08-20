# Instructor Solution — Exercise 007

## Root Cause

The bug is a **mutable default argument** in `src/batch_processor.py`, line 26:

```python
class ResultCollector:
    def __init__(self, batch_id: str, buffer: list = []):
        self.batch_id = batch_id
        self._buffer = buffer
        self._flushed = False
```

The default `buffer: list = []` is evaluated **once** at class definition time. Every `ResultCollector` instance that doesn't pass an explicit `buffer` argument shares the **same list object**.

## Why It Causes the Crash

The `BatchProcessor.process_batch()` method creates a new `ResultCollector` for each batch:

```python
collector = ResultCollector(batch_id)  # no explicit buffer → uses shared default
```

Because `flush()` does NOT clear the buffer (it only copies it):

```python
def flush(self) -> BatchSummary:
    ...
    results = list(self._buffer)  # copies current contents
    return self._build_summary(results)  # but never clears self._buffer
```

The shared list accumulates results from ALL batches:

| Batch | Items Added | Buffer Size at Flush | Reported Count |
|-------|-------------|---------------------|----------------|
| 1     | 50          | 50                  | 50             |
| 2     | 50          | 100                 | 100            |
| 3     | 5           | 105                 | 105            |
| **Total reported** | | | **255** |

The integrity check in `main.py` correctly detects that 255 ≠ 105 and raises `RuntimeError`.

## Why Tests Pass

The test suite doesn't catch this because:

1. **Isolation per test**: Each test function creates its own `ResultCollector`, but the shared buffer accumulates across tests. The tests use `>=` assertions (e.g., `assert summary.reconciled >= 1`) which pass even with inflated counts.

2. **No cross-batch assertions**: No test creates two collectors and asserts they report independent counts.

3. **Order dependence**: The first test to create a `ResultCollector` with the default buffer happens to get correct counts (buffer starts empty). Later tests get inflated counts but use permissive assertions.

## The Fix

Replace the mutable default argument with `None` and create a new list in the constructor:

```python
class ResultCollector:
    def __init__(self, batch_id: str, buffer: list = None):
        self.batch_id = batch_id
        self._buffer = buffer if buffer is not None else []
        self._flushed = False
```

This ensures each instance gets its own independent list.

## Alternative Fix

Keep the default but clear the buffer after flushing:

```python
def flush(self) -> BatchSummary:
    if self._flushed:
        return self._build_summary([])
    self._flushed = True
    results = list(self._buffer)
    self._buffer.clear()  # ← add this line
    return self._build_summary(results)
```

This fixes the symptom but not the underlying design flaw (shared mutable state). The first fix is preferred because it eliminates the shared state entirely.

## Red Herrings

Students (and agents) may investigate these before finding the real cause:

| Red Herring | Why It Looks Suspicious | Why It's Not the Problem |
|-------------|------------------------|--------------------------|
| Threading / ThreadPoolExecutor | Concurrent access might cause data races | The threading is correct — futures complete before flush is called |
| `__del__` method | Finalizers are notoriously unreliable | The `__del__` only logs a warning; it doesn't affect the buffer contents |
| `verify_integrity()` in main.py | The traceback points here | This is the **detection** not the **cause** |
| Pipeline stages | Complex processing might lose/duplicate data | Each stage processes one transaction at a time correctly |
| CSV parsing | Maybe duplicate rows? | 105 unique transactions, verified by ID |

## Debugging Clues

An effective debugger (human or agent) should notice:

1. **Batch counts `[50, 100, 105]`** — each batch reports exactly the sum of itself plus all previous batches. This is an accumulation pattern, not a random corruption.

2. **`--batch-size 105` works** — with only one batch, there's nothing to accumulate from, so it reports 105 correctly and passes integrity.

3. **`--batch-size 20` shows `[20, 40, 60, 80, 100, 105]`** — same accumulation pattern, just more visible.

4. **Tests pass** — the bug requires multiple `ResultCollector` instances using the default buffer. Most tests create exactly one.

## Test That Would Catch This

```python
def test_independent_collectors():
    """Two collectors created with defaults should not share state."""
    collector_a = ResultCollector("batch-a")
    collector_b = ResultCollector("batch-b")

    txn = make_transaction(id="TXN-A")
    txn.status = TransactionStatus.RECONCILED
    collector_a.add_result(txn)

    # Collector B should have nothing
    summary_b = collector_b.flush()
    assert summary_b.total_transactions == 0
```

## Evaluation Criteria

| Criterion | Excellent | Adequate | Needs Improvement |
|-----------|-----------|----------|-------------------|
| Time to root cause | < 3 agent turns | 3–6 turns | > 6 turns or needed direct hint |
| Pattern recognition | Identified accumulation from batch counts alone | Identified after reading batch_processor.py | Didn't notice pattern |
| Hypothesis quality | "Shared state between batches" early on | Tested several hypotheses systematically | Jumped to conclusions without evidence |
| Fix correctness | `None` default with factory | Buffer clear in flush | Fix elsewhere or incomplete |
| Explanation depth | Explains WHY mutable defaults share state | Identifies the bug but not the mechanism | Patches without explaining |
| Red herring avoidance | Didn't investigate threading or `__del__` deeply | Brief investigation, moved on quickly | Spent significant time on red herrings |
