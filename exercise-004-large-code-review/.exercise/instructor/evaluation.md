# Evaluation Template — Exercise 004: Large Code Review

Use this template to record and compare results across different agents, models, or prompting strategies.

---

## Run Information

| Field | Value |
|-------|-------|
| Agent | |
| Model | |
| Date | |
| Prompt/Strategy | |
| Notes | |

---

## Summary Metrics

| Metric | Value |
|--------|-------|
| Total seeded issues | 14 |
| Issues reported by agent | |
| True positives (seeded issues found) | |
| False positives (reported but not real issues) | |
| Seeded issues missed | |
| False positive rate | |

### By Severity

| Severity | Total Seeded | Found | Missed |
|----------|-------------|-------|--------|
| Critical | 3 | | |
| High | 5 | | |
| Medium | 5 | | |
| Low | 1 | | |

### Key Rates

```
Recall = true seeded issues found / 14

Precision = true findings / total findings reported

F1 Score = 2 * (Precision * Recall) / (Precision + Recall)
```

| Rate | Value |
|------|-------|
| Recall | /14 = |
| Precision | / = |
| F1 Score | |

---

## Detailed Issue Tracking

| Issue ID | Severity | Difficulty | Found? | Agent's Description | Notes |
|----------|----------|------------|--------|--------------------|----|
| ISSUE-01 | Critical | Easy | | | |
| ISSUE-02 | Critical | Medium | | | |
| ISSUE-03 | High | Easy | | | |
| ISSUE-04 | High | Hard | | | |
| ISSUE-05 | Critical | Medium | | | |
| ISSUE-06 | High | Hard | | | |
| ISSUE-07 | Medium | Hard | | | |
| ISSUE-08 | Medium | Medium | | | |
| ISSUE-09 | High | Easy | | | |
| ISSUE-10 | Medium | Medium | | | |
| ISSUE-11 | Medium | Easy | | | |
| ISSUE-12 | Low | Easy | | | |
| ISSUE-13 | High | Hard | | | |
| ISSUE-14 | Medium | Medium | | | |

---

## False Positive Tracking

Did the agent incorrectly flag any of these intentionally correct items?

| Item | Flagged? | Agent's Reasoning | Notes |
|------|----------|-------------------|-------|
| FP-1: Transfer fee 0.5% | | | |
| FP-2: max_occurrences = None | | | |
| FP-3: Admin response format | | | |

Other false positives reported:

| # | File | Agent's Claim | Why It's Wrong |
|---|------|---------------|----------------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

---

## Qualitative Assessment

### Context Awareness

Did the agent inspect unchanged files to understand impact?

- [ ] Yes — agent explicitly referenced unchanged code
- [ ] Partially — agent mentioned needing context but didn't check
- [ ] No — agent only analyzed the diff

Evidence:

### Explanation Quality

Rate 1-5 (1 = poor, 5 = excellent):

| Dimension | Score | Notes |
|-----------|-------|-------|
| Clarity of descriptions | | |
| Accuracy of root cause | | |
| Quality of fix recommendations | | |
| Appropriate severity ratings | | |
| Logical organization | | |

### Detection by Category

| Category | Issues in Category | Found | Rate |
|----------|-------------------|-------|------|
| Security | 3 (01, 02, 03) | | |
| Correctness | 4 (04, 09, 10, 14) | | |
| Authorization | 1 (05) | | |
| Regression/API | 2 (06, 13) | | |
| Concurrency | 1 (07) | | |
| Performance | 1 (08) | | |
| Testing | 1 (11) | | |
| Maintainability | 1 (12) | | |

### Detection by Difficulty

| Difficulty | Issues | Found | Rate |
|------------|--------|-------|------|
| Easy | 5 (01, 03, 09, 11, 12) | | |
| Medium | 5 (02, 05, 08, 10, 14) | | |
| Hard | 4 (04, 06, 07, 13) | | |

---

## Comparison Table (Multiple Runs)

Use this table to compare results across different agents, models, or prompts:

| Run | Agent | Model | Prompt | Recall | Precision | F1 | Critical Found | Notes |
|-----|-------|-------|--------|--------|-----------|-----|----------------|-------|
| 1 | | | | | | | /3 | |
| 2 | | | | | | | /3 | |
| 3 | | | | | | | /3 | |
| 4 | | | | | | | /3 | |
| 5 | | | | | | | /3 | |

---

## Observations

### What the agent was best at:



### What the agent missed consistently:



### Effect of prompting strategy:



### Recommendations for improvement:


