# Skill Example 1 — Problem (Baseline)

## Scenario: Creating a System Architecture Diagram

You have a small inventory management system and need to generate a **system architecture diagram** using PlantUML that clearly communicates the system's components, layers, and data flow to both developers and stakeholders.

This is the **baseline** version — no agent skills are configured. The agent must rely entirely on its general knowledge to produce the diagram.

## The Project

A Python-based inventory management system deployed on AWS (Lambda + API Gateway + DynamoDB) with:

- **Models** — Product, Category, and StockMovement data classes (Pydantic)
- **Services** — Business logic for inventory operations (stock checks, reordering, reporting)
- **API** — Flask REST endpoints for managing inventory, deployed as Lambda via Mangum
- **Infrastructure** — AWS CDK stack defining Lambda, API Gateway, and DynamoDB tables
- **Data** — Sample inventory dataset and a requirements document

## What to Try

Open this project in Kiro and ask the agent:

1. "Create a PlantUML system architecture diagram that shows all the components, their layers, and how data flows through the system."
2. "Generate a PlantUML deployment diagram showing how this system would be deployed in a production environment."
3. "Create a PlantUML sequence diagram showing the reorder alert workflow from API request through to the response."

## What You'll Likely Observe

Without skills to guide it, the agent will:

- Produce diagrams with **inconsistent styling** — no color scheme, mixed notation, arbitrary layout choices
- **Miss architectural layers** or include irrelevant details
- Make arbitrary choices about **level of abstraction** (too high-level or too detailed)
- Output **no consistent visual language** — components, boundaries, and relationships are drawn differently each time
- Diagram quality and structure will **vary significantly between sessions**
- No standard legend, title formatting, or annotation style

## Compare With

See [`../exercise-003-skill-solution/`](../exercise-003-skill-solution/) for the same project with a PlantUML skill configured. The skill provides diagram templates, color palettes, component conventions, and architectural patterns that produce consistent, professional-quality architecture diagrams every time.
