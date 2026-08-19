# Steering Example 1 — Problem (Baseline)

## Scenario: Adding Features to a Cloud-Deployed Task Management API

You have a partially-built task management REST API deployed on AWS using CDK (Lambda + API Gateway + DynamoDB). The existing code was written without consistent conventions — it mixes different error handling patterns, naming styles, and response formats. This represents a realistic codebase that grew organically as the team shipped fast.

Your job: **ask the agent to add a new "comments" feature** to the tasks API, allowing users to add, list, and delete comments on tasks.

## The Project

A Python Flask API for managing tasks, deployed as a serverless application on AWS:

- **API Layer** — Flask app wrapped with Mangum for Lambda execution behind API Gateway
- **Data Layer** — DynamoDB tables for tasks and users (falls back to in-memory for local dev)
- **Infrastructure** — AWS CDK stack defining Lambda, API Gateway, and DynamoDB resources
- **Models** — Task, User data classes (inconsistent style)
- **Routes** — Existing endpoints for tasks and users (mixed patterns)
- **Data** — Sample seed data for local development

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌───────────────┐
│   Client    │────▶│  API Gateway     │────▶│  Lambda (Flask)  │────▶│   DynamoDB    │
│             │     │  /prod/*         │     │  Mangum adapter  │     │  Tasks table  │
└─────────────┘     └──────────────────┘     └──────────────────┘     │  Users table  │
                                                                       └───────────────┘
```

## Project Structure

```
exercise-002-steering-problem/
├── src/
│   ├── app.py              # Flask routes (inconsistent patterns)
│   ├── models.py           # Task, User classes
│   └── store.py            # DynamoDB / in-memory data access
├── cdk/
│   ├── app.py              # CDK app entry point
│   ├── stacks/
│   │   └── api_stack.py    # Lambda + API Gateway + DynamoDB stack
│   ├── cdk.json            # CDK configuration
│   └── requirements.txt    # CDK dependencies
├── data/
│   └── seed_data.json      # Sample data for local development
├── lambda_handler.py       # Mangum wrapper for Lambda
└── requirements.txt        # Runtime dependencies (Flask, Mangum, Boto3)
```

## Existing Inconsistencies (intentional)

The codebase deliberately mixes patterns to simulate what happens without standards:

| Aspect | What you'll see |
|--------|----------------|
| Error responses | Sometimes `{"error": "msg"}`, sometimes `{"message": "msg"}`, sometimes `{"detail": "msg"}` |
| Naming | Mix of `snake_case` and `camelCase` in JSON responses |
| Status codes | Inconsistent use (sometimes 200 for creation, sometimes 201) |
| Validation | Some endpoints validate input, others don't |
| Docstrings | Some functions have them, others don't |

## What to Try

Open this project in Kiro and ask the agent:

1. "Add a comments feature to the tasks API. Users should be able to add a comment to a task, list all comments on a task, and delete a comment. Include the DynamoDB table in the CDK stack."

## What You'll Likely Observe

Without steering, the agent will:

- **Pick up on the inconsistencies** and may replicate any of the existing patterns randomly.
- Produce code that "works" but doesn't follow any single consistent style.
- Make arbitrary choices about error format, naming, validation depth, etc.
- May or may not follow the existing DynamoDB patterns in the store layer.
- CDK additions may not match the conventions used in the existing stack.
- The resulting code may match some existing patterns and clash with others.

## Running Locally

```bash
pip install -r requirements.txt
python -m src.app
```

The app starts on `http://localhost:5000` using in-memory storage with seed data.

## Deploying to AWS

```bash
cd cdk
pip install -r requirements.txt
cdk deploy
```

Requires AWS credentials configured and CDK bootstrapped in the target account.

## Compare With

See [`../exercise-002-steering-solution/`](../exercise-002-steering-solution/) for the same project with steering files that define clear conventions. When the agent adds the comments feature there, it follows the documented standards consistently — including infrastructure patterns for the CDK stack.
