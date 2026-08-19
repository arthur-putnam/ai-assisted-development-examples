"""CDK stack for the Inventory Management API."""

from aws_cdk import (
    Duration,
    RemovalPolicy,
    Stack,
    aws_apigateway as apigw,
    aws_dynamodb as dynamodb,
    aws_lambda as lambda_,
    aws_logs as logs,
)
from constructs import Construct


class InventoryManagementStack(Stack):
    """Deploys the Inventory Management API as Lambda behind API Gateway with DynamoDB."""

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # --- DynamoDB Tables ---

        categories_table = dynamodb.Table(
            self,
            "CategoriesTable",
            table_name="inventory-categories",
            partition_key=dynamodb.Attribute(
                name="id", type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
        )

        products_table = dynamodb.Table(
            self,
            "ProductsTable",
            table_name="inventory-products",
            partition_key=dynamodb.Attribute(
                name="sku", type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
        )

        products_table.add_global_secondary_index(
            index_name="category-index",
            partition_key=dynamodb.Attribute(
                name="category_id", type=dynamodb.AttributeType.STRING
            ),
        )

        movements_table = dynamodb.Table(
            self,
            "MovementsTable",
            table_name="inventory-stock-movements",
            partition_key=dynamodb.Attribute(
                name="id", type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
        )

        movements_table.add_global_secondary_index(
            index_name="product-sku-index",
            partition_key=dynamodb.Attribute(
                name="product_sku", type=dynamodb.AttributeType.STRING
            ),
        )

        # --- Lambda Function ---

        api_handler = lambda_.Function(
            self,
            "ApiHandler",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="lambda_handler.handler",
            code=lambda_.Code.from_asset(
                "../",
                exclude=[
                    "cdk/*",
                    ".venv/*",
                    "*.pyc",
                    "__pycache__",
                    "cdk.out/*",
                    "*.puml",
                    "generate_presentation.py",
                ],
            ),
            timeout=Duration.seconds(30),
            memory_size=256,
            environment={
                "CATEGORIES_TABLE_NAME": categories_table.table_name,
                "PRODUCTS_TABLE_NAME": products_table.table_name,
                "MOVEMENTS_TABLE_NAME": movements_table.table_name,
                "POWERTOOLS_SERVICE_NAME": "inventory-management-api",
                "LOG_LEVEL": "INFO",
            },
            log_retention=logs.RetentionDays.ONE_WEEK,
        )

        categories_table.grant_read_write_data(api_handler)
        products_table.grant_read_write_data(api_handler)
        movements_table.grant_read_write_data(api_handler)

        # --- API Gateway ---

        api = apigw.RestApi(
            self,
            "InventoryManagementApi",
            rest_api_name="Inventory Management API",
            description="REST API for inventory, stock, and category management",
            deploy_options=apigw.StageOptions(
                stage_name="prod",
                throttling_rate=100,
                throttling_burst=200,
            ),
        )

        proxy = api.root.add_proxy(
            default_integration=apigw.LambdaIntegration(api_handler),
            any_method=True,
        )

        # Also handle the root path
        api.root.add_method("ANY", apigw.LambdaIntegration(api_handler))
