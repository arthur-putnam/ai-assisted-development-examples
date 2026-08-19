---
inclusion: always
---
# AI Assisted Development Examples Repository

## Purpose

This repository contains self-contained exercises demonstrating techniques, patterns, strengths, limitations, and workflows for AI-assisted software development.

The repository is intended primarily for **teaching and demonstrations**.

Each exercise should allow a student or instructor to quickly reproduce a scenario, use a coding agent to perform a task, and evaluate the results.

Examples may demonstrate topics such as:

- Agent steering
- Agent skills
- Code review
- Context management
- Planning
- Specification-driven development
- Subagents
- Agentic workflows
- Testing and verification
- Debugging
- Refactoring
- Documentation generation
- Tool use
- Human verification of AI-generated work
- Common AI-assisted development failure modes

Exercises should prioritize **hands-on experimentation over explanation alone**.

---

# Repository Structure

Every exercise MUST exist as a top-level directory.

Exercise directories use the following naming convention:

```text
exercise-NNN-short-descriptive-title
```

Where:

- `exercise` is always lowercase.
- `NNN` is a zero-padded sequential exercise number.
- The number starts at `001`.
- Words are separated with hyphens.
- The title should be short but descriptive.
- Do not reuse exercise numbers.

Examples:

```text
exercise-001-large-code-review
exercise-002-project-steering
exercise-003-agent-skills
exercise-004-context-management
exercise-005-spec-driven-development
exercise-006-subagents
```

The repository should therefore resemble:

```text
ai-assisted-development-examples/
│
├── README.md
│
├── exercise-001-large-code-review/
│   ├── README.md
│   ├── EXERCISE.md
│   ├── src/
│   └── tests/
│
├── exercise-002-project-steering/
│   ├── README.md
│   ├── EXERCISE.md
│   ├── src/
│   └── tests/
│
└── exercise-003-agent-skills/
    ├── README.md
    ├── EXERCISE.md
    ├── src/
    └── tests/
```

Do not place unrelated exercise files at the repository root.

---

# Exercise Numbering

Exercise IDs are permanent.

Once an exercise has been assigned an ID, do not renumber it simply because another exercise is added or removed.

For example, if the repository contains:

```text
exercise-001-large-code-review
exercise-002-project-steering
exercise-003-agent-skills
```

and exercise 002 is removed, do NOT automatically rename exercise 003 to exercise 002.

Stable IDs make it possible to reference exercises from:

- Course materials
- Presentations
- Documentation
- Assignments
- External links

Before creating a new exercise, inspect the existing exercise directories and determine the next available sequential ID.

For example:

```text
exercise-001-...
exercise-002-...
exercise-003-...
```

The next exercise should normally be:

```text
exercise-004-...
```

---

# Standard Exercise Structure

Exercises should be **self-contained**.

Do not assume that another exercise has already been completed.

A typical exercise should follow:

```text
exercise-NNN-title/
│
├── README.md
├── EXERCISE.md
│
├── src/
├── tests/
│
└── <exercise-specific-files>
```

Not every exercise requires `src/` and `tests/`.

Adapt the internal structure to the technique being demonstrated.

For example, a code review exercise may contain:

```text
exercise-001-large-code-review/
│
├── .exercise/
│   ├── changes.patch
│   └── instructor/
│       ├── expected-findings.md
│       └── evaluation.md
│
├── src/
├── tests/
│
├── setup-exercise.sh
├── setup-exercise.ps1
├── EXERCISE.md
└── README.md
```

A steering exercise might instead contain:

```text
exercise-002-project-steering/
│
├── problem/
│   ├── src/
│   └── tests/
│
├── solution/
│   ├── .kiro/
│   │   └── steering/
│   ├── src/
│   └── tests/
│
├── EXERCISE.md
└── README.md
```

Use the structure that makes the concept easiest to understand.

---

# README.md vs EXERCISE.md

Each exercise should normally contain both files.

## README.md

`README.md` explains the example itself.

It should provide enough information for someone browsing GitHub to understand:

- What the exercise demonstrates
- Why the technique matters
- What application or scenario is being used
- Prerequisites
- How to install dependencies
- How to run the project
- How to reset the project when applicable

Keep this relatively concise.

## EXERCISE.md

`EXERCISE.md` contains the actual student activity.

It should explain:

- Scenario
- Goal
- Starting state
- Student task
- Suggested workflow
- Constraints
- Verification steps
- Reflection questions when useful

Do not include instructor answers in `EXERCISE.md`.

---

# Exercise Design Philosophy

Exercises should demonstrate a **specific AI-assisted development concept**.

Avoid exercises that simply ask:

> Ask the AI to write some code.

Instead, design exercises around a workflow or engineering problem.

Good examples include:

```text
Large change
    ↓
Agent reviews code
    ↓
Human evaluates findings
```

or:

```text
Same task
   ↓
No steering
   ↓
Observe results

Same task
   ↓
With steering
   ↓
Observe results

Compare
```

or:

```text
Large problem
    ↓
Agent decomposes work
    ↓
Subagents investigate independently
    ↓
Agent synthesizes findings
    ↓
Human verifies
```

The exercise should make the **technique being taught observable**.

---

# Prefer Comparison-Based Exercises

When appropriate, exercises should allow students to compare approaches.

Examples:

```text
Without steering
vs.
With steering
```

```text
Generic prompt
vs.
Structured prompt
```

```text
Single agent
vs.
Subagents
```

```text
Agent with limited context
vs.
Agent with repository context
```

```text
Generate and trust
vs.
Generate, test, and verify
```

Students should be able to observe how changing the development workflow affects the result.

---

# Problem and Solution Structure

When an exercise benefits from showing a before/after state, use:

```text
problem/
solution/
```

For example:

```text
exercise-002-project-steering/
│
├── problem/
│   └── ...
│
├── solution/
│   └── ...
│
├── EXERCISE.md
└── README.md
```

`problem/` should represent the starting state provided to the student.

`solution/` should represent the intended completed state or reference implementation.

Do not use `problem/solution` mechanically. If a reset script, patch, Git branch, fixture, or another mechanism creates a clearer exercise, use that instead.

---

# Instructor-Only Material

When an exercise requires an answer key or evaluation rubric, store it under:

```text
.exercise/instructor/
```

For example:

```text
.exercise/
└── instructor/
    ├── expected-findings.md
    └── evaluation.md
```

Student-facing documentation should not accidentally reveal these answers.

When generating an exercise, do not reference instructor answers from:

- Source comments
- EXERCISE.md
- Student README instructions
- Test names
- Variable names
- Commit messages

---

# Exercise Setup and Reset

Exercises should be **repeatable whenever practical**.

A student should be able to experiment freely and then return the exercise to its original state.

For exercises requiring setup, prefer providing:

```text
setup-exercise.sh
setup-exercise.ps1
```

Support both Bash and PowerShell when practical because students may be using:

- Windows
- macOS
- Linux

Setup scripts should be deterministic.

Running the setup multiple times should produce the same starting state.

---

# Keep Exercises Agent-Agnostic

Exercises should generally work with multiple repository-aware coding agents.

Examples include:

- Kiro
- Claude Code
- Codex
- Cursor
- Other coding agents

Avoid unnecessary dependencies on one product.

Tool-specific exercises are allowed when the **tool-specific capability itself is what is being taught**.

For example:

```text
exercise-003-kiro-steering
```

may intentionally use:

```text
.kiro/steering/
```

because Kiro steering is the concept being demonstrated.

---

# Prompts

When providing example prompts, avoid making them so specific that they reveal the answer.

Prefer prompts that demonstrate reusable techniques.

For example:

> Review all uncommitted changes in this repository. Inspect surrounding and unchanged code when necessary. Do not modify files. Rank findings by severity and explain the reasoning behind each finding.

Instead of:

> Check `authentication.py` for the missing authorization call.

Students should learn **how to direct an agent**, not simply be told where the answer is.

---

# Realism

Prefer realistic software engineering scenarios.

Exercises should resemble actual work such as:

- Reviewing a pull request
- Implementing a feature
- Investigating a bug
- Understanding an unfamiliar repository
- Refactoring legacy code
- Writing tests
- Updating an API
- Migrating a dependency
- Creating documentation
- Planning an implementation
- Responding to changing requirements

Avoid toy examples when a slightly larger realistic example would better demonstrate the concept.

At the same time, exercises should remain small enough for students to understand during a class, workshop, or independent lab.

---

# Intentional Problems

When intentionally creating bugs, vulnerabilities, architectural problems, or other mistakes:

Do NOT reveal them through obvious comments such as:

```text
TODO: this is intentionally broken
BUG: students should find this
SECURITY ISSUE HERE
```

The problem should appear naturally in the code.

Where an answer key is necessary, document it separately under:

```text
.exercise/instructor/
```

---

# Dependencies

Keep dependencies minimal.

Prefer:

- Well-known libraries
- Easy local installation
- No paid services
- No cloud resources unless necessary
- No credentials
- No external accounts unless the exercise specifically teaches integration with that service

A student should ideally be able to clone an exercise and begin within a few minutes.

---

# Testing

Where appropriate, exercises should include automated tests.

The clean starting application should normally have a passing test suite.

When intentionally creating failures, document expected behavior in instructor materials.

Tests should support the lesson rather than give away every answer.

For example, in a code review exercise it can be useful for:

```text
95% of tests to pass
```

while several genuine bugs remain undetected.

This reinforces the principle:

> Passing tests do not necessarily mean a change is correct.

---

# Creating a New Exercise

When asked to create a new exercise, follow this process.

## Step 1: Inspect Existing Exercises

Inspect the repository root for directories matching:

```text
exercise-NNN-*
```

Determine the highest existing exercise number.

Assign the next sequential number.

Do not guess the number without inspecting the repository.

---

## Step 2: Identify the Learning Objective

Clearly determine what technique the exercise demonstrates.

Examples:

```text
Steering
Agent skills
Code review
Context management
Subagents
Planning
Verification
```

The exercise should ideally have **one primary learning objective**.

Related secondary concepts are fine, but avoid combining so many ideas that students cannot tell what caused the observed result.

---

## Step 3: Design the Experiment

Determine what students will actually do.

Ask:

1. What state does the student start with?
2. What do they ask the coding agent to do?
3. What behavior should they observe?
4. How can they verify the result?
5. Is there something useful to compare against?
6. How can they reset the exercise?

Prefer observable experiments.

---

## Step 4: Choose the Structure

Select the simplest structure that supports the learning objective.

Possible approaches include:

```text
problem/
solution/
```

or:

```text
baseline + patch
```

or:

```text
multiple configurations
```

or:

```text
single project + setup/reset script
```

Do not force every exercise into the same internal structure.

Consistency at the repository level is important, but exercise design should remain flexible.

---

## Step 5: Implement the Example

Create the complete working exercise.

Do not stop after creating placeholder files or describing what should eventually be implemented.

The exercise should be usable by a student.

---

## Step 6: Create Documentation

At minimum, create:

```text
README.md
EXERCISE.md
```

Add instructor materials when appropriate.

---

## Step 7: Validate

Before considering an exercise complete:

- Run setup instructions.
- Install dependencies from a clean environment when practical.
- Run tests.
- Run setup/reset scripts.
- Verify paths.
- Verify example commands.
- Verify student instructions.
- Verify the intended starting state.
- Verify that instructor answers are not accidentally exposed.

---

## Step 8: Update Repository README

When a new exercise is created, update the root:

```text
README.md
```

Add the exercise to the exercise catalog.

Use a table similar to:

| Exercise | Topic | Description |
|---|---|---|
| `exercise-001-large-code-review` | Code Review | Use a coding agent to review a large set of uncommitted changes. |
| `exercise-002-project-steering` | Steering | Compare agent behavior with and without repository steering. |

Keep exercises ordered numerically.

---

# Naming New Exercises

Use concise names.

Good:

```text
exercise-001-large-code-review
exercise-002-project-steering
exercise-003-agent-skills
exercise-004-context-management
exercise-005-subagents
```

Avoid:

```text
exercise-1-review
exercise001_review
example-code-review
large-code-review-example-final
exercise-002-example-showing-how-steering-works
```

The directory name should tell a student approximately what concept it demonstrates without becoming excessively long.

---

# Do Not Modify Existing Exercises Unnecessarily

When creating a new exercise:

- Do not refactor unrelated exercises.
- Do not renumber existing exercises.
- Do not change existing exercise behavior unless required.
- Do not introduce repository-wide dependencies unnecessarily.
- Do not copy large amounts of code between exercises without a reason.

Keep changes scoped to the new exercise plus necessary repository-level documentation.

---

# Root Repository README

The repository root README should explain the overall project and provide an exercise catalog.

A student should be able to land on the repository and quickly understand:

```text
What is this?
        ↓
Which exercise should I use?
        ↓
Open exercise directory
        ↓
Read EXERCISE.md
        ↓
Run setup
        ↓
Use coding agent
        ↓
Evaluate result
```

The root README should not contain all instructions for every exercise.

Detailed instructions belong inside each exercise.

---

# Core Teaching Principle

The repository should reinforce the workflow:

```text
Human provides intent
        ↓
AI creates / investigates / reviews
        ↓
Tools provide evidence
        ↓
Human verifies
```

Exercises should demonstrate that effective AI-assisted software development is not simply:

```text
Ask AI
  ↓
Accept answer
```

Instead, students should practice:

```text
Provide context
      ↓
Give clear intent
      ↓
Use appropriate agent capabilities
      ↓
Inspect agent output
      ↓
Use tests/tools/evidence
      ↓
Verify
      ↓
Iterate
```

Whenever designing a new exercise, ask:

> **What will the student learn about working effectively with coding agents that they would not learn from simply asking an LLM a question?**

If that answer is unclear, refine the exercise before implementing it.

---

# Definition of Done for New Exercises

A new exercise is complete when:

- [ ] Uses the `exercise-NNN-title` naming convention.
- [ ] Uses the next appropriate exercise number.
- [ ] Has a clear primary learning objective.
- [ ] Is self-contained.
- [ ] Includes `README.md`.
- [ ] Includes `EXERCISE.md`.
- [ ] Has clear setup instructions.
- [ ] Has clear student instructions.
- [ ] Can be reproduced from a clean checkout.
- [ ] Can be reset when applicable.
- [ ] Works on common student environments when practical.
- [ ] Does not expose instructor answers.
- [ ] Uses realistic software engineering scenarios.
- [ ] Includes tests when appropriate.
- [ ] Has been validated.
- [ ] Root `README.md` exercise catalog has been updated.
- [ ] Existing exercises have not been unnecessarily modified.