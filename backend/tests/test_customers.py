import uuid
from fastapi.testclient import TestClient
from app.models.user import User


def test_customer_listing_and_isolation(
    client: TestClient,
    admin_headers: dict[str, str],
    staff_headers: dict[str, str],
    customer_a: User,
    customer_a_headers: dict[str, str],
    customer_b: User,
):
    # Customer cannot list customers (403)
    res_cust = client.get("/api/v1/customers", headers=customer_a_headers)
    assert res_cust.status_code == 403
    assert res_cust.json()["error"]["code"] == "FORBIDDEN"

    # Staff can list customers
    res_staff = client.get("/api/v1/customers", headers=staff_headers)
    assert res_staff.status_code == 200
    assert "items" in res_staff.json()

    # Admin can list customers
    res_admin = client.get("/api/v1/customers", headers=admin_headers)
    assert res_admin.status_code == 200
    assert res_admin.json()["total"] >= 2


def test_customer_get_isolation(
    client: TestClient,
    customer_a: User,
    customer_a_headers: dict[str, str],
    customer_b: User,
    admin_headers: dict[str, str],
):
    # Customer can access their own record
    res_self = client.get(f"/api/v1/customers/{customer_a.id}", headers=customer_a_headers)
    assert res_self.status_code == 200
    assert res_self.json()["id"] == str(customer_a.id)
    assert res_self.json()["email"] == customer_a.email

    # Customer requesting another customer's record MUST receive 404 (not 403)
    res_other = client.get(f"/api/v1/customers/{customer_b.id}", headers=customer_a_headers)
    assert res_other.status_code == 404
    assert res_other.json()["error"]["code"] == "NOT_FOUND"

    # Admin can access any customer's record
    res_admin_a = client.get(f"/api/v1/customers/{customer_a.id}", headers=admin_headers)
    assert res_admin_a.status_code == 200
    assert res_admin_a.json()["id"] == str(customer_a.id)

    res_admin_b = client.get(f"/api/v1/customers/{customer_b.id}", headers=admin_headers)
    assert res_admin_b.status_code == 200
    assert res_admin_b.json()["id"] == str(customer_b.id)

    # Unknown ID returns 404
    fake_id = uuid.uuid4()
    res_fake = client.get(f"/api/v1/customers/{fake_id}", headers=admin_headers)
    assert res_fake.status_code == 404


def test_customer_create_and_temp_password(
    client: TestClient,
    staff_headers: dict[str, str],
):
    # Staff creates customer without password -> returns temporary_password
    payload = {
        "email": "temp_pw_cust@example.com",
        "full_name": "Temp Customer",
        "phone": "1234567890",
    }
    res = client.post("/api/v1/customers", json=payload, headers=staff_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "temp_pw_cust@example.com"
    assert data["role"] == "customer"
    assert "temporary_password" in data
    assert data["temporary_password"] is not None


def test_customer_update_isolation_and_permissions(
    client: TestClient,
    customer_a: User,
    customer_a_headers: dict[str, str],
    customer_b: User,
    admin_headers: dict[str, str],
):
    # Customer updates self
    res_self = client.put(
        f"/api/v1/customers/{customer_a.id}",
        json={"phone": "9999999999", "company_name": "Updated Corp"},
        headers=customer_a_headers,
    )
    assert res_self.status_code == 200
    assert res_self.json()["phone"] == "9999999999"

    # Customer tries to update another customer -> 404
    res_other = client.put(
        f"/api/v1/customers/{customer_b.id}",
        json={"phone": "0000000000"},
        headers=customer_a_headers,
    )
    assert res_other.status_code == 404
    assert res_other.json()["error"]["code"] == "NOT_FOUND"

    # Customer cannot change role or is_active
    res_hack = client.put(
        f"/api/v1/customers/{customer_a.id}",
        json={"role": "admin", "is_active": False},
        headers=customer_a_headers,
    )
    assert res_hack.status_code == 200
    assert res_hack.json()["role"] == "customer"
    assert res_hack.json()["is_active"] is True

    # Admin deactivates customer (soft delete, 204)
    res_del = client.delete(f"/api/v1/customers/{customer_a.id}", headers=admin_headers)
    assert res_del.status_code == 204
