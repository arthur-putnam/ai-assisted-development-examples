from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class Product:
    id: str
    name: str
    description: str
    price: float
    stock: int = 0
    category: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: Optional[str] = None
