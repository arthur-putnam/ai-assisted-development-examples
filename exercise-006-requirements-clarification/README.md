# Exercise 006 — Requirements Clarification

## What This Exercise Demonstrates

How to use a coding agent to transform a vague stakeholder request into a structured, written specification — and why doing so before implementation produces better results.

## Why This Matters

In real software projects, feature requests rarely arrive as precise specifications. They come as Slack messages, standup comments, or brief emails full of ambiguity. Developers routinely face a choice:

1. Start implementing immediately based on assumptions.
2. Pause, clarify the requirements, and write them down before coding.

Coding agents amplify this dynamic. An agent given a vague prompt will happily generate *something* — but the output will reflect the ambiguity of the input: inconsistent scope, missing edge cases, unstated assumptions baked in silently.

This exercise makes the difference between those two approaches directly observable.

## Scenario

An order management API already exists (customers, orders, status transitions). The product manager sends a casual message requesting a "notifications" feature. The message is deliberately vague — it mentions email, SMS, webhooks, preferences, delivery reliability, and promotional messaging without specifying any of them clearly.

The stakeholder request is in [`data/stakeholder-request.md`](data/stakeholder-request.md).

## Learning Objective

Students will observe that:

- Agents generate code confidently regardless of whether the input is well-specified.
- Implementations from vague prompts contain implicit assumptions the agent never surfaces.
- Using the agent to *ask clarifying questions first* produces a written artifact (a spec) that improves consistency, completeness, and alignment with actual intent.
- The spec-first approach is faster for complex features because it reduces rework.

## Prerequisites

- A coding agent (Kiro, Claude Code, Cursor, or similar)
- A project with an existing codebase to work in (any order/e-commerce API will do, or students can scaffold one)

## How to Use

1. Read the stakeholder request in `data/stakeholder-request.md`.
2. Open `EXERCISE.md` for the full student activity.
3. Follow the two-pass experiment described there.
4. Compare results.

## Structure

```
exercise-006-requirements-clarification/
├── README.md                       # This file
├── EXERCISE.md                     # Student activity and instructions
├── data/
│   └── stakeholder-request.md      # The vague PM request
└── .exercise/
    └── instructor/
        ├── example-spec.md         # What a good clarified spec looks like
        └── evaluation.md           # Rubric for evaluating student work
```
