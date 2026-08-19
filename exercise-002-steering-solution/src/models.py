"""Models for the task management system."""

# NOTE: This file intentionally uses inconsistent patterns to demonstrate
# what a codebase looks like without coding standards / steering.


class Task:
    """A task in the system."""

    def __init__(self, id, title, description, status, priority, assignee_id, created_by, created_at, due_date=None):
        self.id = id
        self.title = title
        self.description = description
        self.status = status  # todo, in_progress, done
        self.priority = priority  # low, medium, high, critical
        self.assignee_id = assignee_id
        self.created_by = created_by
        self.created_at = created_at
        self.due_date = due_date

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "status": self.status,
            "priority": self.priority,
            "assigneeId": self.assignee_id,  # camelCase here
            "createdBy": self.created_by,    # camelCase here
            "created_at": self.created_at,   # but snake_case here
            "due_date": self.due_date,       # and here
        }


# No docstring on this class - inconsistent documentation
class User:
    def __init__(self, id, username, email, display_name):
        self.id = id
        self.username = username
        self.email = email
        self.display_name = display_name

    def serialize(self):  # Different method name than Task.to_dict()
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "displayName": self.display_name,  # camelCase
        }
