import uuid
from datetime import datetime
from typing import Dict, List, Optional

from src.models.product import Product


class ProductService:
    """Manages product CRUD operations using an in-memory store."""

    def __init__(self):
        self._products: Dict[str, Product] = {}
        self._seed_data()

    def _seed_data(self):
        products = [
            Product(
                id="prod-001",
                name="Wireless Mouse",
                description="Ergonomic wireless mouse with USB receiver",
                price=29.99,
                stock=150,
                category="electronics",
            ),
            Product(
                id="prod-002",
                name="Mechanical Keyboard",
                description="Full-size mechanical keyboard with Cherry MX switches",
                price=89.99,
                stock=75,
                category="electronics",
            ),
            Product(
                id="prod-003",
                name="USB-C Hub",
                description="7-in-1 USB-C hub with HDMI, USB-A, and SD card reader",
                price=49.99,
                stock=200,
                category="electronics",
            ),
            Product(
                id="prod-004",
                name="Laptop Stand",
                description="Adjustable aluminum laptop stand",
                price=39.99,
                stock=120,
                category="accessories",
            ),
        ]
        for product in products:
            self._products[product.id] = product

    def list_products(self, category: Optional[str] = None) -> List[Product]:
        products = list(self._products.values())
        if category:
            products = [p for p in products if p.category == category]
        return products

    def get_product(self, product_id: str) -> Optional[Product]:
        return self._products.get(product_id)

    def create_product(
        self,
        name: str,
        description: str,
        price: float,
        stock: int = 0,
        category: Optional[str] = None,
    ) -> Product:
        product = Product(
            id=f"prod-{uuid.uuid4().hex[:8]}",
            name=name,
            description=description,
            price=price,
            stock=stock,
            category=category,
        )
        self._products[product.id] = product
        return product

    def update_product(self, product_id: str, **kwargs) -> Optional[Product]:
        product = self._products.get(product_id)
        if not product:
            return None
        for key, value in kwargs.items():
            if hasattr(product, key) and key not in ("id", "created_at"):
                setattr(product, key, value)
        product.updated_at = datetime.utcnow().isoformat()
        return product

    def delete_product(self, product_id: str) -> bool:
        if product_id in self._products:
            del self._products[product_id]
            return True
        return False
