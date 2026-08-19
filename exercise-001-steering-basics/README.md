# Exercise 001 — Steering Basics

## Prerequisites

- Kiro IDE installed and open
- An empty or minimal workspace (any folder blank will do)
- Throughout this lab, always open a new chat window between exercises unless told otherwise. Steering files are picked up at the start of a conversation.

---

## Exercise 1 — The Problem Steering Solves

**Goal:** See what happens when Kiro has no project context, then fix it.

### Step 1.1 — Start clean

Ensure there is no `.kiro/steering/` folder in your workspace. If one exists, delete it.

### Step 1.2 — Ask Kiro to build something

Open a new chat and enter:

```
Create a Python utility module at src/utils/string_helpers.py with functions to slugify a string, truncate with ellipsis, and capitalize the first letter of each word.
```

Look at the output. Take note of:

- Naming style (snake_case? camelCase?)
- Are there docstrings? What format?
- Are there type hints?
- Does it raise specific exceptions or bare `Exception`?
- Are there tests?

### Step 1.3 — Revert

Press **Revert** in the chat to undo the generated files.

### Step 1.4 — Create your first steering file

Create the folder `.kiro/steering/` in your workspace root, then create `.kiro/steering/python-standards.md`:

```markdown
---
inclusion: always
---

# Python Standards

- Use snake_case for functions and variables, PascalCase for classes.
- Add Sphinx / reStructuredText (reST) Style docstrings to every public function with Args, Returns, and Raises sections.
- Use type hints on all function signatures (parameters and return types).
- Raise specific exceptions — never bare `Exception` or plain strings.
- Write pure functions where possible — no side effects.
- Prefer `pathlib` over `os.path` for filesystem operations.
- Prefer `dataclasses` for simple data containers.
```

### Step 1.5 — Re-run the same prompt

Open a new chat and enter the exact same prompt from Step 1.2.

### Step 1.6 — Compare

The steered version should now have type hints, Google-style docstrings, snake_case naming, and specific exceptions. Same prompt, better output — because Kiro now knows your conventions.

**Takeaway:** Without steering, Kiro makes reasonable guesses. With steering, it follows your standards every time.


## Additional Exercises

### Quick Reference

| Inclusion Mode | Front Matter | When It Loads |
|---|---|---|
| always | `inclusion: always` | Every interaction |
| fileMatch | `inclusion: fileMatch` + `fileMatchPattern: [...]` | When matched files are in context |
| manual | `inclusion: manual` | When referenced with `#name` or `/name` |
| auto | `inclusion: auto` + `name` + `description` | When Kiro's request matches the description |

| Scope | Location | Priority |
|---|---|---|
| Workspace | `.kiro/steering/` | Higher |
| Global | `~/.kiro/steering/` | Lower |

| Syntax | Purpose |
|---|---|
| `#[[file:path/to/file]]` | Reference a live workspace file in steering |
| `#steering-name` | Include a manual steering file in chat |
| `/steering-name` | Include via slash command |
