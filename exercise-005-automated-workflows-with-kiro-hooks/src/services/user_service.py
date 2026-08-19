import uuid
from datetime import datetime
from typing import Dict, List, Optional

from src.models.user import User


class UserService:
    """Manages user CRUD operations using an in-memory store."""

    def __init__(self):
        self._users: Dict[str, User] = {}
        self._seed_data()

    def _seed_data(self):
        users = [
            User(id="usr-001", email="alice@example.com", name="Alice Johnson", role="admin"),
            User(id="usr-002", email="bob@example.com", name="Bob Smith", role="customer"),
            User(id="usr-003", email="carol@example.com", name="Carol Williams", role="customer"),
        ]
        for user in users:
            self._users[user.id] = user

    def list_users(self, role: Optional[str] = None) -> List[User]:
        users = list(self._users.values())
        if role:
            users = [u for u in users if u.role == role]
        return users

    def get_user(self, user_id: str) -> Optional[User]:
        return self._users.get(user_id)

    def create_user(self, email: str, name: str, role: str = "customer") -> User:
        user = User(
            id=f"usr-{uuid.uuid4().hex[:8]}",
            email=email,
            name=name,
            role=role,
        )
        self._users[user.id] = user
        return user

    def update_user(self, user_id: str, **kwargs) -> Optional[User]:
        user = self._users.get(user_id)
        if not user:
            return None
        for key, value in kwargs.items():
            if hasattr(user, key) and key not in ("id", "created_at"):
                setattr(user, key, value)
        user.updated_at = datetime.utcnow().isoformat()
        return user

    def delete_user(self, user_id: str) -> bool:
        if user_id in self._users:
            del self._users[user_id]
            return True
        return False
