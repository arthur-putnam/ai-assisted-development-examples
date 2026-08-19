import json


def test_list_products(client):
    response = client.get("/api/products")
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    assert len(data) >= 4


def test_list_products_filter_by_category(client):
    response = client.get("/api/products?category=electronics")
    assert response.status_code == 200
    data = response.get_json()
    assert all(p["category"] == "electronics" for p in data)


def test_get_product(client):
    response = client.get("/api/products/prod-001")
    assert response.status_code == 200
    data = response.get_json()
    assert data["id"] == "prod-001"
    assert data["name"] == "Wireless Mouse"
    assert data["price"] == 29.99


def test_get_product_not_found(client):
    response = client.get("/api/products/prod-999")
    assert response.status_code == 404
    assert response.get_json()["error"] == "Product not found"


def test_create_product(client):
    response = client.post(
        "/api/products",
        data=json.dumps({
            "name": "Monitor Arm",
            "description": "Adjustable single monitor arm",
            "price": 79.99,
            "stock": 50,
            "category": "accessories",
        }),
        content_type="application/json",
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["name"] == "Monitor Arm"
    assert data["price"] == 79.99
    assert "id" in data


def test_create_product_missing_fields(client):
    response = client.post(
        "/api/products",
        data=json.dumps({"name": "Incomplete"}),
        content_type="application/json",
    )
    assert response.status_code == 400


def test_update_product(client):
    response = client.put(
        "/api/products/prod-001",
        data=json.dumps({"price": 24.99}),
        content_type="application/json",
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["price"] == 24.99
    assert data["updated_at"] is not None


def test_update_product_not_found(client):
    response = client.put(
        "/api/products/prod-999",
        data=json.dumps({"price": 9.99}),
        content_type="application/json",
    )
    assert response.status_code == 404


def test_delete_product(client):
    response = client.delete("/api/products/prod-004")
    assert response.status_code == 204


def test_delete_product_not_found(client):
    response = client.delete("/api/products/prod-999")
    assert response.status_code == 404
