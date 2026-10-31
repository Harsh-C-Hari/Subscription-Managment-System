from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User


def test_register_creates_customer_and_ignores_role(client: TestClient, db_session: Session):
    payload = {
        "email": "register_test@example.com",
        "password": "Password123!",
        "full_name": "Test Customer",
        "role": "admin",  # should be ignored
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["email"] == "register_test@example.com"
    assert data["role"] == "customer"
    assert data["is_active"] is True

    # Verify directly in DB
    user = db_session.query(User).filter(User.email == "register_test@example.com").first()
    assert user is not None
    assert user.role == "customer"


def test_register_duplicate_email(client: TestClient, customer_a: User):
    payload = {
        "email": customer_a.email.upper(),  # case-insensitive duplicate check
        "password": "Password123!",
        "full_name": "Duplicate Ann",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "CONFLICT"


def test_register_short_password(client: TestClient):
    payload = {
        "email": "short_pw@example.com",
        "password": "short",  # < 8 chars
        "full_name": "Short Password",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "VALIDATION_ERROR"


def test_login_success(client: TestClient, admin_user: User):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": admin_user.email, "password": "Admin@12345"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] == 3600
    assert data["user"]["email"] == admin_user.email
    assert data["user"]["role"] == "admin"


def test_login_invalid_password(client: TestClient, admin_user: User):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": admin_user.email, "password": "WrongPassword"},
    )
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "UNAUTHORIZED"


def test_login_inactive_user(client: TestClient, db_session: Session):
    from app.core.security import get_password_hash
    inactive_user = User(
        email="inactive@example.com",
        password_hash=get_password_hash("Secret123!"),
        full_name="Inactive Person",
        role="customer",
        is_active=False,
    )
    db_session.add(inactive_user)
    db_session.commit()

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "inactive@example.com", "password": "Secret123!"},
    )
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "UNAUTHORIZED"


def test_get_me_authenticated_and_unauthenticated(
    client: TestClient, customer_a: User, customer_a_headers: dict[str, str]
):
    # Without token
    res_no_auth = client.get("/api/v1/auth/me")
    assert res_no_auth.status_code == 401
    assert res_no_auth.json()["error"]["code"] == "UNAUTHORIZED"

    # With token
    res_auth = client.get("/api/v1/auth/me", headers=customer_a_headers)
    assert res_auth.status_code == 200
    data = res_auth.json()
    assert data["id"] == str(customer_a.id)
    assert data["email"] == customer_a.email
    assert data["role"] == "customer"


def test_create_staff_role_access(
    client: TestClient,
    admin_headers: dict[str, str],
    staff_headers: dict[str, str],
    customer_a_headers: dict[str, str],
):
    payload = {
        "email": "new_staff@brightloop.com",
        "password": "StaffPassword123!",
        "full_name": "New Staff Member",
    }

    # Customer cannot create staff (403)
    res_cust = client.post("/api/v1/auth/staff", json=payload, headers=customer_a_headers)
    assert res_cust.status_code == 403
    assert res_cust.json()["error"]["code"] == "FORBIDDEN"

    # Staff cannot create staff (403)
    res_staff = client.post("/api/v1/auth/staff", json=payload, headers=staff_headers)
    assert res_staff.status_code == 403
    assert res_staff.json()["error"]["code"] == "FORBIDDEN"

    # Admin can create staff (201)
    res_admin = client.post("/api/v1/auth/staff", json=payload, headers=admin_headers)
    assert res_admin.status_code == 201
    data = res_admin.json()
    assert data["email"] == "new_staff@brightloop.com"
    assert data["role"] == "staff"
