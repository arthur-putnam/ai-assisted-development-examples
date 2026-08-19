# AI Assisted Development Examples

A collection of practical, side-by-side examples demonstrating techniques for working effectively with AI coding agents.

## Overview

Each example focuses on a specific AI-assisted development technique — steering, agent skills, subagents, context management, specifications, planning, and more. Examples are structured as paired projects:

| Variant | Purpose |
|---------|---------|
| **Problem / Baseline** | The project *without* the technique applied. |
| **Solution / Enhanced** | The same project configured *with* the technique, including agent instructions, skills, steering files, or supporting artifacts. |

The goal is to make each technique concrete and directly comparable. Rather than describing concepts in the abstract, the repository provides working examples that demonstrate how adding structure and context changes an agent's behavior, output quality, consistency, and ability to complete software engineering tasks.

## Exercises

### Exercise 001 — Steering Basics

**Scenario:** A blank canvas to learn how steering files work by creating one from scratch.

| Directory | Description |
|-----------|-------------|
| [`exercise-001-steering-basics/`](exercise-001-steering-basics/) | Create your first `.kiro/steering/` file and observe how it influences agent behavior. No existing codebase — just a README and space to experiment. |

**What to try:** Add a steering file with coding conventions of your choice, then ask the agent to generate code. See how it follows your rules.

---

### Exercise 002 — Consistent Feature Development (Steering)

**Scenario:** A task management API deployed on AWS (Lambda + API Gateway + DynamoDB) with deliberately inconsistent code (mixed error formats, naming styles, status codes). You ask the agent to add a new "comments" feature including the DynamoDB table and CDK infrastructure.

| Directory | Description |
|-----------|-------------|
| [`exercise-002-steering-problem/`](exercise-002-steering-problem/) | Baseline — the inconsistent API with AWS CDK deployment but no guidance. The agent may replicate any of the conflicting patterns when adding comments, and CDK additions may not match existing stack conventions. |
| [`exercise-002-steering-solution/`](exercise-002-steering-solution/) | Enhanced — same inconsistent codebase plus `.kiro/steering/` with **api-conventions.md**, **code-style.md**, and **error-handling.md**. The agent follows the documented standards instead of mimicking the existing mess. |

**What to try:** Ask the agent to "add a comments feature to the tasks API, including the DynamoDB table in the CDK stack" in both versions. Compare error handling patterns, status codes, naming, infrastructure patterns, and code structure in the generated code.

---

### Exercise 003 — System Architecture Diagram Generation (Skills)

**Scenario:** An inventory management system where you ask an agent to create a PlantUML system architecture diagram showing components, layers, and data flow.

| Directory | Description |
|-----------|-------------|
| [`exercise-003-skill-problem/`](exercise-003-skill-problem/) | Baseline — complete inventory system (Flask API on Lambda + API Gateway + DynamoDB, Pydantic models, business logic). No skills configured. The agent produces architecture diagrams with no structured guidance. |
| [`exercise-003-skill-solution/`](exercise-003-skill-solution/) | Enhanced — same codebase plus `.kiro/skills/` with a **PlantUML skill** (color palettes, diagram conventions, templates) and a **PowerPoint skill** (slide structures, content guidelines, audience-specific formats). |

**What to try:** Ask the agent to create a system architecture diagram in both versions. Compare the consistency, styling, layer organization, and quality of the output.

---

### Exercise 004 — Large Code Review

**Scenario:** A Personal Finance Tracker REST API (Flask + SQLite) with a large uncommitted feature change (~23 files, ~1,800 lines). The change adds recurring transactions, notifications, bulk import/export, transfers, and admin reporting — but contains intentionally seeded issues spanning security, correctness, performance, and regressions.

| Directory | Description |
|-----------|-------------|
| [`exercise-004-large-code-review/`](exercise-004-large-code-review/) | Use a coding agent to review a large set of uncommitted changes before they are committed. Evaluate how effectively the agent identifies real issues, avoids false positives, and explains its reasoning. |

**What to try:** Run the setup script to apply the exercise patch, then ask a coding agent to perform a thorough code review. Compare results across different agents, models, or prompting strategies using the included evaluation template.

## Repository Structure

```
ai-assisted-development-examples/
├── exercise-001-steering-basics/       # Blank canvas — create your first steering file
│   └── README.md
│
├── exercise-002-steering-problem/      # Task API, AWS deployment, inconsistent code
│   ├── src/                            # Flask API with mixed patterns
│   ├── cdk/                            # CDK stack (Lambda + API Gateway + DynamoDB)
│   ├── data/                           # Seed data
│   ├── lambda_handler.py              # Mangum wrapper for Lambda
│   └── README.md
│
├── exercise-002-steering-solution/     # Same API + steering files
│   ├── .kiro/
│   │   └── steering/
│   │       ├── api-conventions.md      # Response format, status codes, naming
│   │       ├── code-style.md           # Model patterns, docstrings, typing
│   │       └── error-handling.md       # Error envelope, validation patterns
│   ├── src/
│   ├── cdk/
│   ├── data/
│   └── README.md
│
├── exercise-003-skill-problem/         # Inventory system, no skills
│   ├── src/                            # Flask API + services + models
│   ├── cdk/                            # CDK stack (Lambda + API Gateway + DynamoDB)
│   ├── data/                           # Sample data + requirements doc
│   ├── lambda_handler.py              # Mangum wrapper for Lambda
│   └── README.md
│
└── exercise-003-skill-solution/        # Same system + agent skills
    ├── .kiro/
    │   └── skills/
    │       ├── plantuml-skill/         # Diagram generation conventions
    │       └── powerpoint-skill/       # Presentation structure templates
    ├── src/
    ├── cdk/                            # CDK stack (Lambda + API Gateway + DynamoDB)
    ├── data/
    ├── lambda_handler.py
    └── README.md

├── exercise-004-large-code-review/     # AI-assisted code review exercise
│   ├── .exercise/
│   │   ├── changes.patch              # Large feature patch with seeded issues
│   │   └── instructor/               # Answer key and evaluation template
│   ├── src/                           # Flask REST API (accounts, transactions, budgets)
│   ├── tests/                         # Unit and integration tests
│   ├── setup-exercise.sh             # Bash setup/reset script
│   ├── setup-exercise.ps1            # PowerShell setup/reset script
│   ├── EXERCISE.md                    # Student instructions
│   └── README.md
```

## Core Idea

> Learn AI-assisted development techniques by seeing the same problem solved with and without them.

## Topics Covered

The repository can grow to cover techniques including:

- **Steering / Instructions** — Providing persistent context and guidelines that shape agent behavior across an entire project.
- **Agent Skills** — Packaging reusable capabilities (templates, workflows, domain knowledge) that agents can invoke on demand.
- **Subagents** — Delegating specialized subtasks to focused agents for better results.
- **Specifications** — Using structured requirements and design documents to guide implementation.
- **Planning** — Breaking complex features into well-defined tasks before execution.
- **Context Management** — Controlling what information the agent sees and when.
- **MCP / Tools** — Extending agent capabilities through Model Context Protocol servers and custom tools.
- **Verification & Testing** — Ensuring agent output correctness through automated checks.
- **Code Review** — Using agents to review large changes for security, correctness, performance, and regression issues.
- **Multi-Agent Workflows** — Coordinating multiple agents to accomplish larger goals.

## Prerequisites

- [Git](https://git-scm.com/) (v2.25+ for sparse-checkout support)
- [Make](https://www.gnu.org/software/make/)
  - **macOS:** included with Xcode Command Line Tools (`xcode-select --install`)
  - **Windows:** install via [Chocolatey](https://chocolatey.org/) (`choco install make`) or use Git Bash with [GnuWin32 Make](https://gnuwin32.sourceforge.net/packages/make.htm)

## Setup

Some examples reference third-party skills that cannot be committed to this repository for licensing reasons. After cloning, run the setup target to download them:

```bash
git clone https://github.com/<your-org>/ai-assisted-development-examples.git
cd ai-assisted-development-examples
make setup
```

This downloads remote skills into the appropriate project directories. Run `make help` to see all available targets.

To remove downloaded skills:

```bash
make clean-skills
```

## How to Use This Repository

1. **Run `make setup`** after cloning to download required remote skills.
2. **Pick an exercise** you want to learn about.
3. **Open the problem project** in Kiro and explore the baseline — try asking the agent to complete the task described in the README without any special configuration.
4. **Open the solution project** in Kiro and try the same prompt — observe how the added structure (skills, steering, specs, etc.) changes the agent's behavior and output.
5. **Compare side by side** — the difference demonstrates the value of the technique.
6. **Adapt the patterns** to your own projects.

## Contributing

Contributions are welcome. To add a new example:

1. Create an `exercise-<NNN>-<technique>-problem/` directory with the baseline project.
2. Create a matching `exercise-<NNN>-<technique>-solution/` directory with the enhanced version.
3. Include a README in each directory explaining the scenario, what to try, and what to observe.
4. Keep examples focused on a single technique for clarity.

## License

See [LICENSE](LICENSE) for details.
