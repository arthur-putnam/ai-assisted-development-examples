import uuid
from datetime import datetime
from typing import Dict, List, Optional

from src.models.order import Order, OrderItem


class OrderService:
    """Manages order operations using an in-memory store."""

    def __init__(self):
        self._orders: Dict[str, Order] = {}
        self._seed_data()

    def _seed_data(self):
        orders = [
            Order(
                id="ord-001",
                user_id="usr-002",
                items=[
                    OrderItem(product_id="prod-001", quantity=1, unit_price=29.99),
                    OrderItem(product_id="prod-004", quantity=2, unit_price=39.99),
                ],
                status="delivered",
                total=109.97,
                created_at="2025-03-15T10:30:00",
            ),
            Order(
                id="ord-002",
                user_id="usr-003",
                items=[
                    OrderItem(product_id="prod-002", quantity=1, unit_price=89.99),
                ],
                status="shipped",
                total=89.99,
                created_at="2025-04-01T14:20:00",
            ),
            Order(
                id="ord-003",
                user_id="usr-002",
                items=[
                    OrderItem(product_id="prod-003", quantity=3, unit_price=49.99),
                ],
                status="pending",
                total=149.97,
                created_at="2025-04-10T09:15:00",
            ),
        ]
        for order in orders:
            self._orders[order.id] = order

    def list_orders(self, user_id: Optional[str] = None) -> List[Order]:
        orders = list(self._orders.values())
        if user_id:
            orders = [o for o in orders if o.user_id == user_id]
        return orders

    def get_order(self, order_id: str) -> Optional[Order]:
        return self._orders.get(order_id)

    def create_order(self, user_id: str, items: List[dict]) -> Order:
        order_items = [
            OrderItem(
                product_id=item["product_id"],
                quantity=item["quantity"],
                unit_price=item["unit_price"],
            )
            for item in items
        ]
        total = sum(item.quantity * item.unit_price for item in order_items)
        order = Order(
            id=f"ord-{uuid.uuid4().hex[:8]}",
            user_id=user_id,
            items=order_items,
            status="pending",
            total=total,
        )
        self._orders[order.id] = order
        return order

    def update_order_status(self, order_id: str, status: str) -> Optional[Order]:
        order = self._orders.get(order_id)
        if not order:
            return None
        valid_statuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"]
        if status not in valid_statuses:
            raise ValueError(f"Invalid status. Must be one of: {valid_statuses}")
        order.status = status
        order.updated_at = datetime.utcnow().isoformat()
        return order

    def cancel_order(self, order_id: str) -> Optional[Order]:
        order = self._orders.get(order_id)
        if not order:
            return None
        if order.status in ("shipped", "delivered"):
            raise ValueError("Cannot cancel an order that has been shipped or delivered")
        order.status = "cancelled"
        order.updated_at = datetime.utcnow().isoformat()
        return order
