import json


def test_list_users(client):
    response = client.get("/api/users")
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    assert len(data) >= 3


def test_list_users_filter_by_role(client):
    response = client.get("/api/users?role=admin")
    assert response.status_code == 200
    data = response.get_json()
    assert all(u["role"] == "admin" for u in data)


def test_get_user(client):
    response = client.get("/api/users/usr-001")
    assert response.status_code == 200
    data = response.get_json()
    assert data["id"] == "usr-001"
    assert data["email"] == "alice@example.com"
    assert data["name"] == "Alice Johnson"
    assert data["role"] == "admin"


def test_get_user_not_found(client):
    response = client.get("/api/users/usr-999")
    assert response.status_code == 404
    assert response.get_json()["error"] == "User not found"


def test_create_user(client):
    response = client.post(
        "/api/users",
        data=json.dumps({"email": "test@example.com", "name": "Test User"}),
        content_type="application/json",
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["email"] == "test@example.com"
    assert data["name"] == "Test User"
    assert data["role"] == "customer"
    assert "id" in data


def test_create_user_missing_fields(client):
    response = client.post(
        "/api/users",
        data=json.dumps({"email": "test@example.com"}),
        content_type="application/json",
    )
    assert response.status_code == 400


def test_update_user(client):
    response = client.put(
        "/api/users/usr-001",
        data=json.dumps({"name": "Alice Updated"}),
        content_type="application/json",
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["name"] == "Alice Updated"
    assert data["updated_at"] is not None


def test_update_user_not_found(client):
    response = client.put(
        "/api/users/usr-999",
        data=json.dumps({"name": "Nobody"}),
        content_type="application/json",
    )
    assert response.status_code == 404


def test_delete_user(client):
    response = client.delete("/api/users/usr-003")
    assert response.status_code == 204


def test_delete_user_not_found(client):
    response = client.delete("/api/users/usr-999")
    assert response.status_code == 404
