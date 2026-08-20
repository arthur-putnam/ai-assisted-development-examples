# Exercise 007 — Debugging with Terminal Context

## What This Demonstrates

Using a coding agent's terminal access to collaboratively debug a runtime crash in a non-trivial Python application. The agent can run the program, observe the error, inspect code, form hypotheses, and iterate — all within the terminal workflow.

## Why This Matters

Real-world debugging rarely starts with "look at line 42." It starts with a crash, a confusing error message, and a traceback that points to a symptom rather than the root cause. Effective agent-assisted debugging requires:

- Sharing the runtime error with the agent (via `/terminal` or pasting output)
- Letting the agent form and test hypotheses
- Guiding the agent when it goes down wrong paths
- Verifying the proposed fix actually resolves the issue

This exercise provides a realistic scenario where the bug is non-obvious, the traceback is misleading, and the test suite passes — forcing genuine investigative debugging rather than pattern matching on an error message.

## The Application

A **Transaction Reconciliation Service** that:

1. Reads financial transactions from a CSV file
2. Processes them through a multi-stage pipeline (validation → enrichment → reconciliation)
3. Uses concurrent batch processing with a thread pool
4. Generates a summary report with integrity verification

The application appears well-structured with proper logging, type hints, dataclasses, and a passing test suite.

## The Problem

Running the application crashes with a `RuntimeError` about data integrity. The error message and traceback point to the verification step in `main.py`, not to the actual source of the bug.

## Prerequisites

- Python 3.8+
- pip

## Setup

```bash
cd exercise-007-debugging-with-terminal
pip install -r requirements.txt
```

## Running

```bash
# Run the application (will crash)
python main.py

# Run with different batch sizes (changes error behavior)
python main.py --batch-size 20
python main.py --batch-size 105

# Run tests (all pass)
python -m pytest tests/ -v

# Run with verbose logging
python main.py --verbose
```

## Key Observations

- The application crashes with a data integrity error
- All 25 tests pass
- The batch size affects the error (try `--batch-size 105` vs `--batch-size 50`)
- The traceback points to `main.py`, not to the buggy code
- The log output contains clues about what's going wrong

## Project Structure

```
exercise-007-debugging-with-terminal/
├── main.py                    # Entry point with CLI and integrity check
├── requirements.txt           # Dependencies (pytest only)
├── data/
│   └── transactions.csv       # 105 sample financial transactions
├── src/
│   ├── __init__.py
│   ├── models.py              # Data models (Transaction, BatchSummary, etc.)
│   ├── pipeline.py            # Processing stages (validation, enrichment, reconciliation)
│   ├── batch_processor.py     # Concurrent batch processing
│   ├── reader.py              # CSV loading
│   └── reporter.py            # JSON report generation
├── tests/
│   ├── __init__.py
│   └── test_pipeline.py       # Unit tests (25 tests, all passing)
├── EXERCISE.md                # Student activity
├── README.md                  # This file
└── .exercise/
    └── instructor/
        └── solution.md        # Root cause analysis and fix
```
