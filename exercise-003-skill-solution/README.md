# Skill Example 1 — Solution (Enhanced)

## Scenario: Documentation Generation for an Inventory System

You have a small inventory management system and need to generate:

1. **Architecture diagrams** (PlantUML) showing system components and their interactions.
2. **A project overview presentation** (PowerPoint-style outline) for a stakeholder meeting.

This is the **enhanced** version — agent skills are configured to provide templates, conventions, and structured workflows for generating these artifacts.

## The Project

The source code is identical to the problem version: a Python-based inventory management system with models, services, an API layer, and sample data.

## Setup

If you haven't already, run `make setup` from the repository root to download the required remote skills:

```bash
cd ..
make setup
```

## What's Different

This project includes `.kiro/skills/` with three packaged skills:

```
.kiro/
└── skills/
    ├── plantuml-skill/         # Downloaded via `make setup`
    │   ├── SKILL.md            # Full PlantUML generation skill
    │   ├── references/         # Styling guide, diagram type references
    │   └── ...
    ├── powerpoint-skill/
    │   └── instruction.md      # Presentation outline structure and templates
    └── pptx-skill/             # Downloaded via `make setup`
        ├── SKILL.md            # Full PPTX creation, editing, and analysis skill
        ├── LICENSE.txt
        └── scripts/            # Python utilities for slide manipulation and QA
```

### PlantUML Skill (remote)

Downloaded from [SpillwaveSolutions/plantuml](https://github.com/SpillwaveSolutions/plantuml). Provides the agent with:
- Support for all 19 PlantUML diagram types (sequence, class, activity, state, component, deployment, use case, object, timing, ER, Gantt, JSON/YAML, mindmaps, WBS, network, wireframes, and more)
- Architecture diagram generation from source code analysis
- Standard color palette and styling (`skinparam` and CSS-like `<style>` settings)
- Component diagram conventions (how to represent layers, databases, external systems)
- Sequence diagram conventions (participant ordering, activation, grouping)
- Reusable template structure for common diagram types
- Markdown processing — extract PlantUML blocks and generate images

### PowerPoint Skill

Provides the agent with:
- A standard slide deck structure (title, agenda, architecture, demo, roadmap, Q&A)
- Formatting rules for each slide type (bullet limits, content depth)
- Guidelines for stakeholder-appropriate language
- Templates for common presentation scenarios (project overview, sprint review, technical deep-dive)

### PPTX Skill (remote)

Downloaded from [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/pptx). Provides the agent with:
- Full `.pptx` file creation using `pptxgenjs` with documented gotchas and best practices
- Editing existing decks via XML manipulation (unzip, edit, repack)
- Python scripts for slide duplication, cleanup, validation, and thumbnail generation
- Design guidelines (color palettes, typography, layout ideas, common mistakes to avoid)
- QA workflow (content checks, file validation, visual inspection via image conversion)

## What to Try

Open this project in Kiro and ask the agent the same questions as the problem version:

1. "Generate a PlantUML component diagram showing the system architecture."
2. "Generate a PlantUML sequence diagram for the reorder workflow."
3. "Create a PowerPoint presentation outline for a stakeholder review of this system."
4. "Create a powerpoint describing the project, include an architecture diagram generated using plantUML."

## Expected Observations

With the skills active:

- **PlantUML diagrams** use a consistent color scheme, proper stereotypes, and follow layer conventions.
- **Sequence diagrams** have proper participant ordering, activation bars, and grouping.
- **Presentation outlines** follow the standard slide structure with appropriate detail level for stakeholders.
- Output is consistent across sessions — the same request produces structurally similar results.
- The agent spends less time on formatting decisions and more time on content accuracy.

## Compare With

See [`../exercise-003-skill-problem/`](../exercise-003-skill-problem/) for the baseline version without skills. Note how the agent's output differs in structure, consistency, and quality.
