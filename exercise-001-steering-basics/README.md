# Exercise 001 — Steering Basics

## Scenario: Your First Steering File

This exercise is a blank canvas. There is no existing codebase — just this README and an empty `.kiro/steering/` directory for you to fill in.

## Objective

Learn how steering files work by creating one from scratch and observing how it influences agent behavior.

## What to Do

1. Open this project in Kiro.
2. Create a `.kiro/steering/` directory and add a markdown file with guidelines of your choice (e.g., coding standards, response style, naming conventions).
3. Ask the agent to generate some code (a small utility, an API endpoint, a data model — anything).
4. Observe how the agent's output follows the rules you wrote in the steering file.
5. Modify or add more steering files and repeat — see how the behavior changes.

## Tips

- Steering files are markdown files placed in `.kiro/steering/` at the workspace root.
- They are included automatically in every agent interaction unless configured otherwise.
- Use front-matter `inclusion: manual` to make a steering file opt-in via the `#` context key.
- Use front-matter `inclusion: fileMatch` with a `fileMatchPattern` to include the file only when certain files are in context.

## Why This Matters

Without steering, an agent makes arbitrary choices about style, conventions, and patterns. Steering files let you define those choices once and have them applied consistently across every interaction — like a style guide the agent actually follows.
