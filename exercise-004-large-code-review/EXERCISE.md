# Exercise 004: Large Code Review

## Scenario

You are a senior developer on the Personal Finance Tracker API team. A colleague has been working for several days on a substantial feature branch that adds:

- Recurring transactions (scheduled repeating income/expenses)
- Notification preferences (alerts for budget thresholds and large transactions)
- Bulk CSV import/export
- Account-to-account transfers
- Admin reporting endpoints

The developer has asked you to review their changes before they commit. The diff is large — approximately 23 files and 1,800+ lines of changes.

Your job is to identify correctness, security, performance, maintainability, and regression issues before this code enters the main branch.

## Goal

Use a coding agent to perform a thorough code review of a large set of uncommitted changes. Evaluate how effectively the agent identifies real problems, avoids false positives, and explains its reasoning.

## Setup

### Prerequisites

- Python 3.8+
- pip
- git

### Install Dependencies

```bash
cd exercise-004-large-code-review
pip install -r requirements.txt
```

### Apply the Exercise Changes

**Linux / macOS:**

```bash
./setup-exercise.sh
```

**Windows (PowerShell):**

```powershell
.\setup-exercise.ps1
```

After setup, verify the exercise state:

```bash
git status
git diff --stat
```

You should see approximately 23 files with uncommitted changes (both modified and new files). Nothing should be staged.

## Student Task

### Step 1: Understand the Baseline

Before reviewing the changes, familiarize yourself with the existing application:

```bash
python -m pytest tests/ -v
```

The baseline test suite should pass. Read the `README.md` to understand the application structure.

### Step 2: Review the Changes

Ask your coding agent to review the uncommitted changes. Here is an example prompt:

> Review all uncommitted changes in this repository as if you were performing a code review before these changes are committed.
>
> Do not modify any files.
>
> Look for correctness issues, security vulnerabilities, regressions, performance problems, maintainability concerns, and missing tests.
>
> Inspect unchanged repository code when necessary to understand the impact of the changes.
>
> For each finding provide:
> - Severity (Critical / High / Medium / Low)
> - File and location
> - Description of the issue
> - Why it is a problem
> - Recommended fix
>
> Rank findings by severity.

You are encouraged to modify this prompt, try different strategies, and compare results.

### Step 3: Evaluate the Results

After receiving the agent's review, consider:

1. **Coverage** — Did the agent find issues across different categories (security, correctness, performance, etc.)?
2. **Depth** — Did the agent identify subtle issues that require understanding multiple files?
3. **Precision** — Did the agent avoid reporting correct code as buggy?
4. **Context awareness** — Did the agent inspect unchanged files to understand impact?
5. **Explanation quality** — Are the explanations clear and actionable?

### Step 4: Run Tests After Patch

You can also run the test suite after applying the patch to see which tests still pass:

```bash
python -m pytest tests/ -v
```

Note: Some tests may fail due to intentional changes. However, **passing tests do not necessarily mean the code is correct**. Several seeded issues are not caught by the existing test suite.

## Suggested Experiments

Try different approaches and compare results:

| Experiment | Strategy |
|---|---|
| Baseline prompt | Use the prompt above as-is |
| Targeted prompt | Ask the agent to focus on security issues only |
| Incremental review | Review one file at a time |
| Context hint | Tell the agent "Some changes may break existing API contracts" |
| Different agent | Run the same prompt with a different coding agent |
| No context | Ask the agent to review without mentioning it should check unchanged files |

## Constraints

- Do **not** modify any source files during the review
- Do **not** commit or stage the changes
- Focus on evaluating the agent's review output, not fixing the code yourself

## Resetting the Exercise

To return to the original exercise state at any time:

**Linux / macOS:**

```bash
./setup-exercise.sh
```

**Windows (PowerShell):**

```powershell
.\setup-exercise.ps1
```

The setup script is idempotent — running it multiple times always produces the same starting state.

## Reflection Questions

After completing the exercise:

1. What types of issues was the agent best at finding? What did it miss?
2. Did the agent look at unchanged code, or did it only analyze the diff?
3. Were any of the agent's findings incorrect (false positives)?
4. How would the review quality change with a more specific or structured prompt?
5. Would you trust this agent's review without human verification? Why or why not?
6. What is the agent's recall (proportion of real issues found) vs. precision (proportion of reported issues that are real)?
