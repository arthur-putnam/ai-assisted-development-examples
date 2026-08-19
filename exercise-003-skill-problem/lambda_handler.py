"""AWS Lambda handler — wraps the Flask app with Mangum for API Gateway integration."""

from mangum import Mangum

from src.app import app

handler = Mangum(app, lifespan="off")
