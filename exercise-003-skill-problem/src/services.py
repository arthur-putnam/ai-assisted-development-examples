"""Business logic for inventory operations."""

from datetime import datetime
from typing import Optional

from .models import (
    Category,
    MovementType,
    Product,
    ReorderAlert,
    StockMovement,
    StockStatus,
    StockSummaryItem,
)
from .store import store


class CategoryService:
    """Manages product categories."""

    def list_categories(self) -> list[Category]:
        return list(store.categories.values())

    def get_category(self, category_id: str) -> Optional[Category]:
        return store.get_category(category_id)

    def create_category(self, category_id: str, name: str, description: Optional[str] = None) -> Category:
        if category_id in store.categories:
            raise ValueError(f"Category '{category_id}' already exists")
        category = Category(id=category_id, name=name, description=description)
        store.categories[category_id] = category
        return category

    def delete_category(self, category_id: str) -> None:
        if category_id not in store.categories:
            raise KeyError(f"Category '{category_id}' not found")
        products_in_category = [p for p in store.products.values() if p.category_id == category_id]
        if products_in_category:
            raise ValueError(
                f"Cannot delete category '{category_id}': "
                f"{len(products_in_category)} products still assigned"
            )
        del store.categories[category_id]


class ProductService:
    """Manages products in the catalog."""

    def list_products(self, category_id: Optional[str] = None) -> list[Product]:
        products = list(store.products.values())
        if category_id:
            products = [p for p in products if p.category_id == category_id]
        return products

    def get_product(self, sku: str) -> Optional[Product]:
        return store.get_product(sku)

    def create_product(
        self,
        sku: str,
        name: str,
        category_id: str,
        unit_price: float,
        reorder_threshold: int,
        description: Optional[str] = None,
    ) -> Product:
        if sku in store.products:
            raise ValueError(f"Product with SKU '{sku}' already exists")
        if category_id not in store.categories:
            raise ValueError(f"Category '{category_id}' not found")

        product = Product(
            sku=sku,
            name=name,
            description=description,
            category_id=category_id,
            unit_price=unit_price,
            reorder_threshold=reorder_threshold,
        )
        store.products[sku] = product
        return product

    def delete_product(self, sku: str) -> None:
        if sku not in store.products:
            raise KeyError(f"Product '{sku}' not found")
        del store.products[sku]


class StockService:
    """Manages stock movements and levels."""

    def get_stock_level(self, sku: str) -> int:
        if sku not in store.products:
            raise KeyError(f"Product '{sku}' not found")
        return store.get_stock_level(sku)

    def record_movement(
        self,
        product_sku: str,
        movement_type: MovementType,
        quantity: int,
        note: Optional[str] = None,
    ) -> StockMovement:
        if product_sku not in store.products:
            raise KeyError(f"Product '{product_sku}' not found")

        if movement_type in (MovementType.SHIPPED,) and quantity > 0:
            quantity = -quantity

        movement = StockMovement(
            id=store.next_movement_id(),
            product_sku=product_sku,
            type=movement_type,
            quantity=quantity,
            timestamp=datetime.utcnow(),
            note=note,
        )
        store.movements.append(movement)
        return movement

    def get_movement_history(
        self,
        product_sku: Optional[str] = None,
        movement_type: Optional[MovementType] = None,
    ) -> list[StockMovement]:
        movements = store.movements

        if product_sku:
            movements = [m for m in movements if m.product_sku == product_sku]
        if movement_type:
            movements = [m for m in movements if m.type == movement_type]

        return sorted(movements, key=lambda m: m.timestamp, reverse=True)

    def check_reorder_alerts(self) -> list[ReorderAlert]:
        alerts = []
        for product in store.products.values():
            current_stock = store.get_stock_level(product.sku)
            if current_stock < product.reorder_threshold:
                suggested_qty = (product.reorder_threshold * 2) - current_stock
                alerts.append(
                    ReorderAlert(
                        product_sku=product.sku,
                        product_name=product.name,
                        current_stock=current_stock,
                        reorder_threshold=product.reorder_threshold,
                        suggested_quantity=suggested_qty,
                    )
                )
        return alerts

    def get_stock_summary(self) -> list[StockSummaryItem]:
        summary = []
        for product in store.products.values():
            current_stock = store.get_stock_level(product.sku)
            category = store.get_category(product.category_id)
            category_name = category.name if category else "Unknown"

            if current_stock <= 0:
                status = StockStatus.OUT_OF_STOCK
            elif current_stock < product.reorder_threshold:
                status = StockStatus.LOW
            else:
                status = StockStatus.OK

            summary.append(
                StockSummaryItem(
                    product_sku=product.sku,
                    product_name=product.name,
                    category_name=category_name,
                    current_stock=current_stock,
                    reorder_threshold=product.reorder_threshold,
                    status=status,
                    unit_price=product.unit_price,
                    stock_value=current_stock * product.unit_price,
                )
            )
        return summary
