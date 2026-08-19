"""In-memory data store for the inventory system."""

import json
from pathlib import Path
from typing import Optional

from .models import Category, Product, StockMovement


class InventoryStore:
    """Simple in-memory store with optional JSON file initialization."""

    def __init__(self):
        self.categories: dict[str, Category] = {}
        self.products: dict[str, Product] = {}
        self.movements: list[StockMovement] = []
        self._movement_counter = 0

    def load_from_file(self, filepath: str) -> None:
        """Load initial data from a JSON file."""
        path = Path(filepath)
        if not path.exists():
            raise FileNotFoundError(f"Data file not found: {filepath}")

        with open(path) as f:
            data = json.load(f)

        for cat_data in data.get("categories", []):
            category = Category(**cat_data)
            self.categories[category.id] = category

        for prod_data in data.get("products", []):
            product = Product(**prod_data)
            self.products[product.sku] = product

        for mov_data in data.get("stock_movements", []):
            movement = StockMovement(**mov_data)
            self.movements.append(movement)
            self._movement_counter += 1

    def next_movement_id(self) -> str:
        self._movement_counter += 1
        return f"mov-{self._movement_counter:03d}"

    def get_category(self, category_id: str) -> Optional[Category]:
        return self.categories.get(category_id)

    def get_product(self, sku: str) -> Optional[Product]:
        return self.products.get(sku)

    def get_movements_for_product(self, sku: str) -> list[StockMovement]:
        return [m for m in self.movements if m.product_sku == sku]

    def get_stock_level(self, sku: str) -> int:
        movements = self.get_movements_for_product(sku)
        return sum(m.quantity for m in movements)


# Global store instance
store = InventoryStore()
