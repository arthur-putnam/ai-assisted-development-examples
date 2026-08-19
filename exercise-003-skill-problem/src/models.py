"""Data models for the inventory management system."""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class MovementType(str, Enum):
    RECEIVED = "RECEIVED"
    SHIPPED = "SHIPPED"
    ADJUSTMENT = "ADJUSTMENT"
    RETURNED = "RETURNED"


class StockStatus(str, Enum):
    OK = "OK"
    LOW = "LOW"
    OUT_OF_STOCK = "OUT_OF_STOCK"


class Category(BaseModel):
    id: str
    name: str
    description: Optional[str] = None


class Product(BaseModel):
    sku: str
    name: str
    description: Optional[str] = None
    category_id: str
    unit_price: float = Field(gt=0)
    reorder_threshold: int = Field(ge=0)


class StockMovement(BaseModel):
    id: str
    product_sku: str
    type: MovementType
    quantity: int
    timestamp: datetime
    note: Optional[str] = None


class ReorderAlert(BaseModel):
    product_sku: str
    product_name: str
    current_stock: int
    reorder_threshold: int
    suggested_quantity: int


class StockSummaryItem(BaseModel):
    product_sku: str
    product_name: str
    category_name: str
    current_stock: int
    reorder_threshold: int
    status: StockStatus
    unit_price: float
    stock_value: float
