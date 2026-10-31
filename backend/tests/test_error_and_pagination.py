from fastapi.testclient import TestClient
from app.models.user import User


def test_error_envelope_consistency(client: TestClient, admin_headers: dict[str, str]):
    # 404 Not Found
    res_404 = client.get("/api/v1/products/00000000-0000-0000-0000-000000000000", headers=admin_headers)
    assert res_404.status_code == 404
    data_404 = res_404.json()
    assert "error" in data_404
    assert data_404["error"]["code"] == "NOT_FOUND"
    assert isinstance(data_404["error"]["message"], str)

    # 401 Unauthorized
    res_401 = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer bad_token"})
    assert res_401.status_code == 401
    data_401 = res_401.json()
    assert "error" in data_401
    assert data_401["error"]["code"] == "UNAUTHORIZED"

    # 422 Validation Error
    res_422 = client.post("/api/v1/products", json={"name": ""}, headers=admin_headers)
    assert res_422.status_code == 422
    data_422 = res_422.json()
    assert "error" in data_422
    assert data_422["error"]["code"] == "VALIDATION_ERROR"
    assert "details" in data_422["error"]
    assert isinstance(data_422["error"]["details"], list)


def test_pagination_envelope(client: TestClient, admin_headers: dict[str, str]):
    # Create 5 products
    for i in range(5):
        client.post(
            "/api/v1/products",
            json={"name": f"Paging Product {i}", "base_price": "100.00"},
            headers=admin_headers,
        )

    # Request page 1 with page_size 2
    res = client.get("/api/v1/products?page=1&page_size=2", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data
    assert "pages" in data
    assert data["page"] == 1
    assert data["page_size"] == 2
    assert len(data["items"]) == 2
    assert data["total"] >= 5
    assert data["pages"] >= 3


def test_forgot_and_reset_password_flow(client: TestClient, customer_a: User):
    # Forgot password request
    res_forgot = client.post("/api/v1/auth/forgot-password", json={"email": customer_a.email})
    assert res_forgot.status_code == 200
    data_forgot = res_forgot.json()
    assert "message" in data_forgot
    # In development mode, reset_token is provided
    assert "reset_token" in data_forgot
    raw_token = data_forgot["reset_token"]
    assert raw_token is not None

    # Reset password with new password
    res_reset = client.post(
        "/api/v1/auth/reset-password",
        json={"token": raw_token, "new_password": "NewSecretPassword123!"},
    )
    assert res_reset.status_code == 200

    # Old password no longer works
    res_old_login = client.post(
        "/api/v1/auth/login",
        json={"email": customer_a.email, "password": "Secret123!"},
    )
    assert res_old_login.status_code == 401

    # New password works
    res_new_login = client.post(
        "/api/v1/auth/login",
        json={"email": customer_a.email, "password": "NewSecretPassword123!"},
    )
    assert res_new_login.status_code == 200
