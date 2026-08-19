# Inventory Management System — Requirements

## Overview

A lightweight inventory management system for a small warehouse operation. The system tracks products, organizes them into categories, and manages stock movements (receiving, shipping, adjustments).

## Functional Requirements

### Product Management
- Add, update, and remove products from the catalog.
- Each product has a SKU, name, description, category, unit price, and reorder threshold.
- Products belong to exactly one category.

### Category Management
- Create and manage product categories.
- Categories have a name and optional description.
- Deleting a category requires reassigning its products first.

### Stock Management
- Record stock movements: RECEIVED, SHIPPED, ADJUSTMENT, RETURNED.
- Each movement records the product, quantity, timestamp, and an optional note.
- Current stock level is calculated from the sum of all movements for a product.

### Reorder Workflow
- The system checks stock levels against reorder thresholds daily.
- When stock falls below the threshold, a reorder alert is generated.
- Alerts include the product, current stock, threshold, and suggested reorder quantity.
- Suggested quantity = (threshold * 2) - current stock.

### Reporting
- Stock summary report: all products with current levels and status (OK, LOW, OUT_OF_STOCK).
- Movement history: filterable by product, date range, and movement type.
- Category summary: total products and total stock value per category.

## Non-Functional Requirements

- REST API with JSON responses.
- Input validation on all endpoints.
- Appropriate HTTP status codes and error messages.
- In-memory storage (no database required for this version).

## System Components

- **API Layer** — Flask routes handling HTTP requests/responses.
- **Service Layer** — Business logic, validation, calculations.
- **Model Layer** — Data structures (Pydantic models).
- **Data Store** — In-memory dictionaries acting as the data layer.
