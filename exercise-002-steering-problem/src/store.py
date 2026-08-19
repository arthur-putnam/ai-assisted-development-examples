"""Data store — uses DynamoDB in AWS, falls back to in-memory for local development."""

import json
import os

import boto3
from botocore.exceptions import ClientError

from .models import Task, User

# Environment
TASKS_TABLE_NAME = os.environ.get("TASKS_TABLE_NAME")
USERS_TABLE_NAME = os.environ.get("USERS_TABLE_NAME")
USE_DYNAMODB = TASKS_TABLE_NAME is not None

# In-memory fallback (local dev)
tasks = {}
users = {}
_next_task_id = 1
_next_user_id = 1


def _get_dynamodb():
    return boto3.resource("dynamodb")


# ============================================================
# TASK OPERATIONS
# ============================================================


def get_all_tasks(status_filter=None):
    if USE_DYNAMODB:
        table = _get_dynamodb().Table(TASKS_TABLE_NAME)
        response = table.scan()
        items = response.get("Items", [])
        result = [_item_to_task(item) for item in items]
        if status_filter:
            result = [t for t in result if t.status == status_filter]
        return result
    else:
        result = list(tasks.values())
        if status_filter:
            result = [t for t in result if t.status == status_filter]
        return result


def get_task(task_id):
    if USE_DYNAMODB:
        table = _get_dynamodb().Table(TASKS_TABLE_NAME)
        try:
            response = table.get_item(Key={"id": task_id})
            item = response.get("Item")
            return _item_to_task(item) if item else None
        except ClientError:
            return None
    else:
        return tasks.get(task_id)


def create_task(task):
    if USE_DYNAMODB:
        table = _get_dynamodb().Table(TASKS_TABLE_NAME)
        table.put_item(Item=_task_to_item(task))
    else:
        tasks[task.id] = task
    return task


def update_task(task):
    if USE_DYNAMODB:
        table = _get_dynamodb().Table(TASKS_TABLE_NAME)
        table.put_item(Item=_task_to_item(task))
    else:
        tasks[task.id] = task
    return task


def delete_task(task_id):
    if USE_DYNAMODB:
        table = _get_dynamodb().Table(TASKS_TABLE_NAME)
        table.delete_item(Key={"id": task_id})
    else:
        del tasks[task_id]


def task_exists(task_id):
    return get_task(task_id) is not None


# ============================================================
# USER OPERATIONS
# ============================================================


def get_all_users():
    if USE_DYNAMODB:
        table = _get_dynamodb().Table(USERS_TABLE_NAME)
        response = table.scan()
        return [_item_to_user(item) for item in response.get("Items", [])]
    else:
        return list(users.values())


def get_user(user_id):
    if USE_DYNAMODB:
        table = _get_dynamodb().Table(USERS_TABLE_NAME)
        try:
            response = table.get_item(Key={"id": user_id})
            item = response.get("Item")
            return _item_to_user(item) if item else None
        except ClientError:
            return None
    else:
        return users.get(user_id)


def create_user(user):
    if USE_DYNAMODB:
        table = _get_dynamodb().Table(USERS_TABLE_NAME)
        table.put_item(Item=_user_to_item(user))
    else:
        users[user.id] = user
    return user


def delete_user(user_id):
    if USE_DYNAMODB:
        table = _get_dynamodb().Table(USERS_TABLE_NAME)
        table.delete_item(Key={"id": user_id})
    else:
        del users[user_id]


def user_exists(user_id):
    return get_user(user_id) is not None


# ============================================================
# ID GENERATION
# ============================================================


def get_next_task_id():
    global _next_task_id
    if USE_DYNAMODB:
        # In production, use a counter or UUID; simplified here
        table = _get_dynamodb().Table(TASKS_TABLE_NAME)
        response = table.scan(Select="COUNT")
        return response["Count"] + 1
    current = _next_task_id
    _next_task_id += 1
    return current


def get_next_user_id():
    global _next_user_id
    if USE_DYNAMODB:
        table = _get_dynamodb().Table(USERS_TABLE_NAME)
        response = table.scan(Select="COUNT")
        return response["Count"] + 1
    current = _next_user_id
    _next_user_id += 1
    return current


# ============================================================
# SEED DATA (local dev only)
# ============================================================


def load_seed_data():
    """Load seed data from JSON file (for local development)."""
    global _next_task_id, _next_user_id

    if USE_DYNAMODB:
        return  # DynamoDB is pre-seeded or populated separately

    data_path = os.path.join(os.path.dirname(__file__), "..", "data", "seed_data.json")
    if not os.path.exists(data_path):
        return

    with open(data_path) as f:
        data = json.load(f)

    for u in data.get("users", []):
        user = User(
            id=u["id"],
            username=u["username"],
            email=u["email"],
            display_name=u["display_name"],
        )
        users[user.id] = user
        _next_user_id = max(_next_user_id, user.id + 1)

    for t in data.get("tasks", []):
        task = Task(
            id=t["id"],
            title=t["title"],
            description=t["description"],
            status=t["status"],
            priority=t["priority"],
            assignee_id=t["assignee_id"],
            created_by=t["created_by"],
            created_at=t["created_at"],
            due_date=t.get("due_date"),
        )
        tasks[task.id] = task
        _next_task_id = max(_next_task_id, task.id + 1)


# ============================================================
# INTERNAL HELPERS
# ============================================================


def _task_to_item(task):
    item = {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "status": task.status,
        "priority": task.priority,
        "created_at": task.created_at,
    }
    if task.assignee_id is not None:
        item["assignee_id"] = task.assignee_id
    if task.created_by is not None:
        item["created_by"] = task.created_by
    if task.due_date is not None:
        item["due_date"] = task.due_date
    return item


def _item_to_task(item):
    return Task(
        id=int(item["id"]),
        title=item["title"],
        description=item.get("description", ""),
        status=item["status"],
        priority=item["priority"],
        assignee_id=item.get("assignee_id"),
        created_by=item.get("created_by"),
        created_at=item.get("created_at", ""),
        due_date=item.get("due_date"),
    )


def _user_to_item(user):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "display_name": user.display_name,
    }


def _item_to_user(item):
    return User(
        id=int(item["id"]),
        username=item["username"],
        email=item["email"],
        display_name=item.get("display_name", item["username"]),
    )
