"""CDK stack for the Task Management API."""

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


class TaskManagementApiStack(Stack):
    """Deploys the Task Management API as Lambda behind API Gateway with DynamoDB storage."""

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # --- DynamoDB Tables ---

        tasks_table = dynamodb.Table(
            self,
            "TasksTable",
            table_name="task-management-tasks",
            partition_key=dynamodb.Attribute(
                name="id", type=dynamodb.AttributeType.NUMBER
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
        )

        users_table = dynamodb.Table(
            self,
            "UsersTable",
            table_name="task-management-users",
            partition_key=dynamodb.Attribute(
                name="id", type=dynamodb.AttributeType.NUMBER
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
        )

        users_table.add_global_secondary_index(
            index_name="username-index",
            partition_key=dynamodb.Attribute(
                name="username", type=dynamodb.AttributeType.STRING
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
                    "infra/*",
                    ".venv/*",
                    "*.pyc",
                    "__pycache__",
                    "cdk.out/*",
                ],
            ),
            timeout=Duration.seconds(30),
            memory_size=256,
            environment={
                "TASKS_TABLE_NAME": tasks_table.table_name,
                "USERS_TABLE_NAME": users_table.table_name,
                "POWERTOOLS_SERVICE_NAME": "task-management-api",
                "LOG_LEVEL": "INFO",
            },
            log_retention=logs.RetentionDays.ONE_WEEK,
        )

        tasks_table.grant_read_write_data(api_handler)
        users_table.grant_read_write_data(api_handler)

        # --- API Gateway ---

        api = apigw.RestApi(
            self,
            "TaskManagementApi",
            rest_api_name="Task Management API",
            description="REST API for task and user management",
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
