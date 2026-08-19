#!/usr/bin/env python3
"""CDK application entry point."""

import aws_cdk as cdk

from stacks.inventory_stack import InventoryManagementStack

app = cdk.App()

InventoryManagementStack(
    app,
    "InventoryManagementStack",
    description="Inventory Management API — Lambda + API Gateway + DynamoDB",
)

app.synth()
