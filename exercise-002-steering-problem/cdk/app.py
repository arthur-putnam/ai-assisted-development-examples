#!/usr/bin/env python3
"""CDK application entry point."""

import aws_cdk as cdk

from stacks.api_stack import TaskManagementApiStack

app = cdk.App()

TaskManagementApiStack(
    app,
    "TaskManagementApiStack",
    description="Task Management API — Lambda + API Gateway + DynamoDB",
)

app.synth()
