import json


def test_list_orders(client):
    response = client.get("/api/orders")
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    assert len(data) >= 3


def test_list_orders_filter_by_user(client):
    response = client.get("/api/orders?user_id=usr-002")
    assert response.status_code == 200
    data = response.get_json()
    assert all(o["user_id"] == "usr-002" for o in data)


def test_get_order(client):
    response = client.get("/api/orders/ord-001")
    assert response.status_code == 200
    data = response.get_json()
    assert data["id"] == "ord-001"
    assert data["status"] == "delivered"
    assert data["total"] == 109.97
    assert len(data["items"]) == 2


def test_get_order_not_found(client):
    response = client.get("/api/orders/ord-999")
    assert response.status_code == 404
    assert response.get_json()["error"] == "Order not found"


def test_create_order(client):
    response = client.post(
        "/api/orders",
        data=json.dumps({
            "user_id": "usr-002",
            "items": [
                {"product_id": "prod-001", "quantity": 2, "unit_price": 29.99}
            ],
        }),
        content_type="application/json",
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["user_id"] == "usr-002"
    assert data["status"] == "pending"
    assert data["total"] == 59.98
    assert len(data["items"]) == 1


def test_create_order_missing_fields(client):
    response = client.post(
        "/api/orders",
        data=json.dumps({"user_id": "usr-002"}),
        content_type="application/json",
    )
    assert response.status_code == 400


def test_create_order_invalid_items(client):
    response = client.post(
        "/api/orders",
        data=json.dumps({
            "user_id": "usr-002",
            "items": [{"product_id": "prod-001"}],
        }),
        content_type="application/json",
    )
    assert response.status_code == 400


def test_update_order_status(client):
    response = client.patch(
        "/api/orders/ord-003/status",
        data=json.dumps({"status": "confirmed"}),
        content_type="application/json",
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "confirmed"
    assert data["updated_at"] is not None


def test_update_order_status_invalid(client):
    response = client.patch(
        "/api/orders/ord-003/status",
        data=json.dumps({"status": "invalid_status"}),
        content_type="application/json",
    )
    assert response.status_code == 400


def test_update_order_status_not_found(client):
    response = client.patch(
        "/api/orders/ord-999/status",
        data=json.dumps({"status": "confirmed"}),
        content_type="application/json",
    )
    assert response.status_code == 404


def test_cancel_order(client):
    response = client.post("/api/orders/ord-003/cancel")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "cancelled"


def test_cancel_shipped_order(client):
    response = client.post("/api/orders/ord-002/cancel")
    assert response.status_code == 400
    assert "Cannot cancel" in response.get_json()["error"]


def test_cancel_order_not_found(client):
    response = client.post("/api/orders/ord-999/cancel")
    assert response.status_code == 404
