from fastapi.testclient import TestClient


def test_product_crud_and_permissions(
    client: TestClient,
    admin_headers: dict[str, str],
    staff_headers: dict[str, str],
    customer_a_headers: dict[str, str],
):
    # Staff / Customer cannot create product (403)
    res_staff = client.post(
        "/api/v1/products",
        json={"name": "Brightloop CRM", "base_price": "999.00"},
        headers=staff_headers,
    )
    assert res_staff.status_code == 403
    assert res_staff.json()["error"]["code"] == "FORBIDDEN"

    res_cust = client.post(
        "/api/v1/products",
        json={"name": "Brightloop CRM", "base_price": "999.00"},
        headers=customer_a_headers,
    )
    assert res_cust.status_code == 403

    # Negative price rejected (422)
    res_neg = client.post(
        "/api/v1/products",
        json={"name": "Negative Product", "base_price": "-10.00"},
        headers=admin_headers,
    )
    assert res_neg.status_code == 422
    assert res_neg.json()["error"]["code"] == "VALIDATION_ERROR"

    # Admin creates product (201)
    res_create = client.post(
        "/api/v1/products",
        json={
            "name": "Brightloop CRM",
            "description": "Enterprise CRM",
            "base_price": "999.00",
        },
        headers=admin_headers,
    )
    assert res_create.status_code == 201
    prod = res_create.json()
    assert prod["name"] == "Brightloop CRM"
    assert prod["base_price"] == "999.00"
    assert isinstance(prod["base_price"], str)
    prod_id = prod["id"]

    # Duplicate name rejected (409)
    res_dup = client.post(
        "/api/v1/products",
        json={"name": "Brightloop CRM", "base_price": "199.00"},
        headers=admin_headers,
    )
    assert res_dup.status_code == 409
    assert res_dup.json()["error"]["code"] == "CONFLICT"

    # Get product detail (includes variants list)
    res_get = client.get(f"/api/v1/products/{prod_id}", headers=customer_a_headers)
    assert res_get.status_code == 200
    assert res_get.json()["variants"] == []

    # Admin updates product
    res_update = client.put(
        f"/api/v1/products/{prod_id}",
        json={"base_price": "1099.00"},
        headers=admin_headers,
    )
    assert res_update.status_code == 200
    assert res_update.json()["base_price"] == "1099.00"

    # Admin soft deletes product
    res_del = client.delete(f"/api/v1/products/{prod_id}", headers=admin_headers)
    assert res_del.status_code == 204

    # Customer no longer sees it in list
    res_list = client.get("/api/v1/products", headers=customer_a_headers)
    assert res_list.status_code == 200
    item_ids = [item["id"] for item in res_list.json()["items"]]
    assert prod_id not in item_ids

    # Admin can still see it when is_active=false
    res_admin_list = client.get("/api/v1/products?is_active=false", headers=admin_headers)
    assert res_admin_list.status_code == 200
    admin_item_ids = [item["id"] for item in res_admin_list.json()["items"]]
    assert prod_id in admin_item_ids


def test_variants_crud_and_effective_price(
    client: TestClient,
    admin_headers: dict[str, str],
    customer_a_headers: dict[str, str],
):
    # Create product first
    res_prod = client.post(
        "/api/v1/products",
        json={"name": "Brightloop Helpdesk", "base_price": "500.00"},
        headers=admin_headers,
    )
    assert res_prod.status_code == 201
    prod_id = res_prod.json()["id"]

    # Customer cannot create variant (403)
    res_v_cust = client.post(
        f"/api/v1/products/{prod_id}/variants",
        json={"name": "Pro Tier", "sku": "HD-PRO", "price_adjustment": "200.00"},
        headers=customer_a_headers,
    )
    assert res_v_cust.status_code == 403

    # Admin creates variant (effective price = 500.00 + 200.00 = 700.00)
    res_v = client.post(
        f"/api/v1/products/{prod_id}/variants",
        json={"name": "Pro Tier", "sku": "HD-PRO", "price_adjustment": "200.00"},
        headers=admin_headers,
    )
    assert res_v.status_code == 201
    v_data = res_v.json()
    assert v_data["name"] == "Pro Tier"
    assert v_data["price_adjustment"] == "200.00"
    assert v_data["effective_price"] == "700.00"
    v_id = v_data["id"]

    # Duplicate SKU rejected (409)
    res_dup_sku = client.post(
        f"/api/v1/products/{prod_id}/variants",
        json={"name": "Pro Tier 2", "sku": "HD-PRO", "price_adjustment": "300.00"},
        headers=admin_headers,
    )
    assert res_dup_sku.status_code == 409

    # List variants
    res_list = client.get(f"/api/v1/products/{prod_id}/variants", headers=customer_a_headers)
    assert res_list.status_code == 200
    assert len(res_list.json()) == 1
    assert res_list.json()[0]["effective_price"] == "700.00"

    # Soft delete variant
    res_del_v = client.delete(f"/api/v1/variants/{v_id}", headers=admin_headers)
    assert res_del_v.status_code == 204


def test_plans_crud_and_validation(
    client: TestClient,
    admin_headers: dict[str, str],
    customer_a_headers: dict[str, str],
):
    # Invalid billing period (422)
    res_invalid_period = client.post(
        "/api/v1/plans",
        json={
            "name": "Invalid Plan",
            "billing_period": "biweekly",  # not in daily, weekly, monthly, yearly
            "price": "100.00",
        },
        headers=admin_headers,
    )
    assert res_invalid_period.status_code == 422

    # Negative price rejected (422)
    res_neg = client.post(
        "/api/v1/plans",
        json={
            "name": "Negative Plan",
            "billing_period": "monthly",
            "price": "-50.00",
        },
        headers=admin_headers,
    )
    assert res_neg.status_code == 422

    # Admin creates valid plan (201)
    res_plan = client.post(
        "/api/v1/plans",
        json={
            "name": "CRM Monthly",
            "billing_period": "monthly",
            "price": "999.00",
            "duration_periods": 12,
            "auto_close": True,
        },
        headers=admin_headers,
    )
    assert res_plan.status_code == 201
    plan_data = res_plan.json()
    assert plan_data["name"] == "CRM Monthly"
    assert plan_data["billing_period"] == "monthly"
    assert plan_data["price"] == "999.00"
    plan_id = plan_data["id"]

    # Duplicate plan name rejected (409)
    res_dup = client.post(
        "/api/v1/plans",
        json={
            "name": "CRM Monthly",
            "billing_period": "yearly",
            "price": "9999.00",
        },
        headers=admin_headers,
    )
    assert res_dup.status_code == 409

    # Customer reads plans
    res_get = client.get(f"/api/v1/plans/{plan_id}", headers=customer_a_headers)
    assert res_get.status_code == 200
    assert res_get.json()["id"] == plan_id

    # Admin soft deletes plan
    res_del = client.delete(f"/api/v1/plans/{plan_id}", headers=admin_headers)
    assert res_del.status_code == 204

    # Customer no longer sees it in list
    res_cust_list = client.get("/api/v1/plans", headers=customer_a_headers)
    assert res_cust_list.status_code == 200
    plan_ids = [p["id"] for p in res_cust_list.json()["items"]]
    assert plan_id not in plan_ids
