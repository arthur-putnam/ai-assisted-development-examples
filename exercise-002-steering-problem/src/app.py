"""Task Management API — Flask application.

NOTE: This file intentionally uses INCONSISTENT patterns to demonstrate
what happens when an agent adds features to a codebase without steering.
The inconsistencies are deliberate teaching tools.
"""

from datetime import datetime

from flask import Flask, jsonify, request

from .models import Task, User
from . import store

app = Flask(__name__)


@app.before_request
def init():
    if not store.USE_DYNAMODB:
        store.load_seed_data()


# ============================================================
# TASK ENDPOINTS
# (Uses {"error": "message"} format, returns 201 for creation)
# ============================================================


@app.route("/tasks", methods=["GET"])
def get_tasks():
    """Get all tasks, optionally filtered by status."""
    status_filter = request.args.get("status")
    result = store.get_all_tasks(status_filter)
    return jsonify([t.to_dict() for t in result])


@app.route("/tasks/<int:task_id>", methods=["GET"])
def get_task(task_id):
    task = store.get_task(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404
    return jsonify(task.to_dict())


@app.route("/tasks", methods=["POST"])
def create_task():
    data = request.get_json()

    # Validates some fields but not others
    if not data or "title" not in data:
        return jsonify({"error": "Title is required"}), 400

    task = Task(
        id=store.get_next_task_id(),
        title=data["title"],
        description=data.get("description", ""),
        status=data.get("status", "todo"),
        priority=data.get("priority", "medium"),
        assignee_id=data.get("assignee_id"),
        created_by=data.get("created_by"),
        created_at=datetime.utcnow().isoformat() + "Z",
        due_date=data.get("due_date"),
    )
    store.create_task(task)
    return jsonify(task.to_dict()), 201


@app.route("/tasks/<int:task_id>", methods=["PUT"])
def update_task(task_id):
    """Update a task."""
    task = store.get_task(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404

    data = request.get_json()
    # No validation on update - just applies whatever is sent
    if "title" in data:
        task.title = data["title"]
    if "description" in data:
        task.description = data["description"]
    if "status" in data:
        task.status = data["status"]
    if "priority" in data:
        task.priority = data["priority"]
    if "assignee_id" in data:
        task.assignee_id = data["assignee_id"]
    if "due_date" in data:
        task.due_date = data["due_date"]

    store.update_task(task)
    return jsonify(task.to_dict())


@app.route("/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    if not store.task_exists(task_id):
        return jsonify({"error": "Task not found"}), 404
    store.delete_task(task_id)
    return "", 204


# ============================================================
# USER ENDPOINTS
# (Uses {"message": "..."} format - DIFFERENT from tasks!)
# (Returns 200 for creation - DIFFERENT from tasks!)
# (No docstrings - DIFFERENT from tasks!)
# ============================================================


@app.route("/users", methods=["GET"])
def get_users():
    return jsonify([u.serialize() for u in store.get_all_users()])


@app.route("/users/<int:user_id>", methods=["GET"])
def get_user(user_id):
    user = store.get_user(user_id)
    if user is None:
        return jsonify({"message": "User does not exist"}), 404  # Different error format!
    return jsonify(user.serialize())


@app.route("/users", methods=["POST"])
def create_user():
    data = request.get_json()

    # Different validation pattern than tasks
    if not data:
        return jsonify({"message": "Request body is required"}), 400

    missing = []
    if "username" not in data:
        missing.append("username")
    if "email" not in data:
        missing.append("email")
    if missing:
        return jsonify({"message": f"Missing fields: {', '.join(missing)}"}), 400

    user = User(
        id=store.get_next_user_id(),
        username=data["username"],
        email=data["email"],
        display_name=data.get("display_name", data["username"]),
    )
    store.create_user(user)
    return jsonify(user.serialize()), 200  # Returns 200 instead of 201!


@app.route("/users/<int:user_id>", methods=["DELETE"])
def deleteUser(user_id):  # camelCase function name - inconsistent!
    if not store.user_exists(user_id):
        # Yet another error format
        return jsonify({"detail": "No user with that ID"}), 404
    store.delete_user(user_id)
    return jsonify({"detail": "User deleted"}), 200  # Returns body on delete, unlike tasks


if __name__ == "__main__":
    app.run(debug=True, port=5000)
