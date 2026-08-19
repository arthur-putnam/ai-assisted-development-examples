"""In-memory data store."""

import json
import os

from .models import Task, User

# Global state
tasks = {}
users = {}
_next_task_id = 1
_next_user_id = 1


def load_seed_data():
    """Load seed data from JSON file."""
    global _next_task_id, _next_user_id

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


def get_next_task_id():
    global _next_task_id
    current = _next_task_id
    _next_task_id += 1
    return current


def get_next_user_id():
    global _next_user_id
    current = _next_user_id
    _next_user_id += 1
    return current
