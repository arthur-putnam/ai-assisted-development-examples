# API Documentation

## Base URL

```
http://localhost:5000
```

## Health Check

### GET /health

Returns the health status of the API.

**Response:** `200 OK`

```json
{
  "status": "ok"
}
```

---

## Users

### GET /api/users

List all users.

**Query Parameters:**

| Parameter | Type   | Required | Description              |
|-----------|--------|----------|--------------------------|
| role      | string | No       | Filter users by role     |

**Response:** `200 OK`

```json
[
  {
    "id": "usr-001",
    "email": "alice@example.com",
    "name": "Alice Johnson",
    "role": "admin",
    "created_at": "2025-01-15T10:00:00",
    "updated_at": null
  }
]
```

---

### GET /api/users/{user_id}

Get a single user by ID.

**Path Parameters:**

| Parameter | Type   | Required | Description   |
|-----------|--------|----------|---------------|
| user_id   | string | Yes      | The user ID   |

**Response:** `200 OK`

```json
{
  "id": "usr-001",
  "email": "alice@example.com",
  "name": "Alice Johnson",
  "role": "admin",
  "created_at": "2025-01-15T10:00:00",
  "updated_at": null
}
```

**Error Response:** `404 Not Found`

```json
{
  "error": "User not found"
}
```

---

### POST /api/users

Create a new user.

**Request Body:**

| Field | Type   | Required | Description                        |
|-------|--------|----------|------------------------------------|
| email | string | Yes      | User email address                 |
| name  | string | Yes      | User display name                  |
| role  | string | No       | User role (default: "customer")    |

**Example Request:**

```json
{
  "email": "dave@example.com",
  "name": "Dave Miller",
  "role": "customer"
}
```

**Response:** `201 Created`

```json
{
  "id": "usr-a1b2c3d4",
  "email": "dave@example.com",
  "name": "Dave Miller",
  "role": "customer",
  "created_at": "2025-04-12T08:30:00",
  "updated_at": null
}
```

**Error Response:** `400 Bad Request`

```json
{
  "error": "Fields 'email' and 'name' are required"
}
```

---

### PUT /api/users/{user_id}

Update an existing user.

**Path Parameters:**

| Parameter | Type   | Required | Description   |
|-----------|--------|----------|---------------|
| user_id   | string | Yes      | The user ID   |

**Request Body:**

Any subset of user fields (`email`, `name`, `role`).

**Example Request:**

```json
{
  "name": "Alice J."
}
```

**Response:** `200 OK`

Returns the updated user object.

**Error Response:** `404 Not Found`

```json
{
  "error": "User not found"
}
```

---

### DELETE /api/users/{user_id}

Delete a user.

**Path Parameters:**

| Parameter | Type   | Required | Description   |
|-----------|--------|----------|---------------|
| user_id   | string | Yes      | The user ID   |

**Response:** `204 No Content`

**Error Response:** `404 Not Found`

```json
{
  "error": "User not found"
}
```

---

## Products

### GET /api/products

List all products.

**Query Parameters:**

| Parameter | Type   | Required | Description                  |
|-----------|--------|----------|------------------------------|
| category  | string | No       | Filter products by category  |

**Response:** `200 OK`

```json
[
  {
    "id": "prod-001",
    "name": "Wireless Mouse",
    "description": "Ergonomic wireless mouse with USB receiver",
    "price": 29.99,
    "stock": 150,
    "category": "electronics",
    "created_at": "2025-01-10T09:00:00",
    "updated_at": null
  }
]
```

---

### GET /api/products/{product_id}

Get a single product by ID.

**Path Parameters:**

| Parameter  | Type   | Required | Description      |
|------------|--------|----------|------------------|
| product_id | string | Yes      | The product ID   |

**Response:** `200 OK`

```json
{
  "id": "prod-001",
  "name": "Wireless Mouse",
  "description": "Ergonomic wireless mouse with USB receiver",
  "price": 29.99,
  "stock": 150,
  "category": "electronics",
  "created_at": "2025-01-10T09:00:00",
  "updated_at": null
}
```

**Error Response:** `404 Not Found`

```json
{
  "error": "Product not found"
}
```

---

### POST /api/products

Create a new product.

**Request Body:**

| Field       | Type   | Required | Description               |
|-------------|--------|----------|---------------------------|
| name        | string | Yes      | Product name              |
| description | string | Yes      | Product description       |
| price       | number | Yes      | Price in USD              |
| stock       | integer| No       | Stock quantity (default: 0)|
| category    | string | No       | Product category          |

**Example Request:**

```json
{
  "name": "Webcam HD",
  "description": "1080p HD webcam with built-in microphone",
  "price": 59.99,
  "stock": 80,
  "category": "electronics"
}
```

**Response:** `201 Created`

```json
{
  "id": "prod-e5f6g7h8",
  "name": "Webcam HD",
  "description": "1080p HD webcam with built-in microphone",
  "price": 59.99,
  "stock": 80,
  "category": "electronics",
  "created_at": "2025-04-12T09:00:00",
  "updated_at": null
}
```

**Error Response:** `400 Bad Request`

```json
{
  "error": "Missing required fields: ['name', 'description', 'price']"
}
```

---

### PUT /api/products/{product_id}

Update an existing product.

**Path Parameters:**

| Parameter  | Type   | Required | Description      |
|------------|--------|----------|------------------|
| product_id | string | Yes      | The product ID   |

**Request Body:**

Any subset of product fields (`name`, `description`, `price`, `stock`, `category`).

**Example Request:**

```json
{
  "price": 24.99,
  "stock": 200
}
```

**Response:** `200 OK`

Returns the updated product object.

**Error Response:** `404 Not Found`

```json
{
  "error": "Product not found"
}
```

---

### DELETE /api/products/{product_id}

Delete a product.

**Path Parameters:**

| Parameter  | Type   | Required | Description      |
|------------|--------|----------|------------------|
| product_id | string | Yes      | The product ID   |

**Response:** `204 No Content`

**Error Response:** `404 Not Found`

```json
{
  "error": "Product not found"
}
```

---

## Orders

### GET /api/orders

List all orders.

**Query Parameters:**

| Parameter | Type   | Required | Description               |
|-----------|--------|----------|---------------------------|
| user_id   | string | No       | Filter orders by user ID  |

**Response:** `200 OK`

```json
[
  {
    "id": "ord-001",
    "user_id": "usr-002",
    "items": [
      {
        "product_id": "prod-001",
        "quantity": 1,
        "unit_price": 29.99
      }
    ],
    "status": "delivered",
    "total": 29.99,
    "created_at": "2025-03-15T10:30:00",
    "updated_at": null
  }
]
```

---

### GET /api/orders/{order_id}

Get a single order by ID.

**Path Parameters:**

| Parameter | Type   | Required | Description    |
|-----------|--------|----------|----------------|
| order_id  | string | Yes      | The order ID   |

**Response:** `200 OK`

```json
{
  "id": "ord-001",
  "user_id": "usr-002",
  "items": [
    {
      "product_id": "prod-001",
      "quantity": 1,
      "unit_price": 29.99
    }
  ],
  "status": "delivered",
  "total": 29.99,
  "created_at": "2025-03-15T10:30:00",
  "updated_at": null
}
```

**Error Response:** `404 Not Found`

```json
{
  "error": "Order not found"
}
```

---

### POST /api/orders

Create a new order.

**Request Body:**

| Field   | Type   | Required | Description                     |
|---------|--------|----------|---------------------------------|
| user_id | string | Yes      | ID of the user placing the order|
| items   | array  | Yes      | List of order items             |

Each item in `items`:

| Field      | Type    | Required | Description           |
|------------|---------|----------|-----------------------|
| product_id | string  | Yes      | Product ID            |
| quantity   | integer | Yes      | Quantity ordered       |
| unit_price | number  | Yes      | Price per unit         |

**Example Request:**

```json
{
  "user_id": "usr-002",
  "items": [
    {
      "product_id": "prod-002",
      "quantity": 1,
      "unit_price": 89.99
    }
  ]
}
```

**Response:** `201 Created`

```json
{
  "id": "ord-b2c3d4e5",
  "user_id": "usr-002",
  "items": [
    {
      "product_id": "prod-002",
      "quantity": 1,
      "unit_price": 89.99
    }
  ],
  "status": "pending",
  "total": 89.99,
  "created_at": "2025-04-12T10:00:00",
  "updated_at": null
}
```

**Error Response:** `400 Bad Request`

```json
{
  "error": "Fields 'user_id' and 'items' are required"
}
```

---

### PATCH /api/orders/{order_id}/status

Update the status of an order.

**Path Parameters:**

| Parameter | Type   | Required | Description    |
|-----------|--------|----------|----------------|
| order_id  | string | Yes      | The order ID   |

**Request Body:**

| Field  | Type   | Required | Description                                                      |
|--------|--------|----------|------------------------------------------------------------------|
| status | string | Yes      | New status: `pending`, `confirmed`, `shipped`, `delivered`, `cancelled` |

**Example Request:**

```json
{
  "status": "confirmed"
}
```

**Response:** `200 OK`

Returns the updated order object.

**Error Response:** `400 Bad Request`

```json
{
  "error": "Invalid status. Must be one of: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']"
}
```

**Error Response:** `404 Not Found`

```json
{
  "error": "Order not found"
}
```

---

### POST /api/orders/{order_id}/cancel

Cancel a pending or confirmed order.

**Path Parameters:**

| Parameter | Type   | Required | Description    |
|-----------|--------|----------|----------------|
| order_id  | string | Yes      | The order ID   |

**Response:** `200 OK`

Returns the cancelled order object with `status` set to `"cancelled"`.

**Error Response:** `400 Bad Request`

```json
{
  "error": "Cannot cancel an order that has been shipped or delivered"
}
```

**Error Response:** `404 Not Found`

```json
{
  "error": "Order not found"
}
```
