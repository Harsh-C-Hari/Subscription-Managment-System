import pytest
from datetime import date, timedelta
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.plan import Plan
from app.models.tax import Tax
from app.models.discount import Discount
from app.models.user import User


def test_taxes_crud_and_permissions(client: TestClient, admin_headers, staff_headers, customer_a_headers):
    # 1. Admin creates tax
    create_res = client.post(
        "/api/v1/taxes",
        headers=admin_headers,
        json={"name": "GST 18%", "rate": "18.00"},
    )
    assert create_res.status_code == 201, create_res.text
    tax_data = create_res.json()
    assert tax_data["name"] == "GST 18%"
    assert tax_data["rate"] == "18.00"
    tax_id = tax_data["id"]

    # Duplicate name fails 409
    dup_res = client.post(
        "/api/v1/taxes",
        headers=admin_headers,
        json={"name": "GST 18%", "rate": "18.00"},
    )
    assert dup_res.status_code == 409
    assert dup_res.json()["error"]["code"] == "CONFLICT"

    # 2. Staff can list taxes
    list_res = client.get("/api/v1/taxes", headers=staff_headers)
    assert list_res.status_code == 200
    assert any(t["id"] == tax_id for t in list_res.json()["items"])

    # 3. Customer cannot access (403)
    cust_res = client.get("/api/v1/taxes", headers=customer_a_headers)
    assert cust_res.status_code == 403

    # 4. Admin updates tax
    put_res = client.put(
        f"/api/v1/taxes/{tax_id}",
        headers=admin_headers,
        json={"rate": "12.00"},
    )
    assert put_res.status_code == 200
    assert put_res.json()["rate"] == "12.00"

    # 5. Admin soft-deletes tax
    del_res = client.delete(f"/api/v1/taxes/{tax_id}", headers=admin_headers)
    assert del_res.status_code == 204

    # Verify inactive
    list_active = client.get("/api/v1/taxes?is_active=true", headers=admin_headers)
    assert not any(t["id"] == tax_id for t in list_active.json()["items"])


def test_discounts_crud_and_validation(client: TestClient, admin_headers, staff_headers, customer_a_headers):
    # 1. Admin creates discount
    create_res = client.post(
        "/api/v1/discounts",
        headers=admin_headers,
        json={
            "name": "Summer 10%",
            "code": "SUMMER10",
            "type": "percentage",
            "value": "10.00",
            "min_amount": "50.00",
            "usage_limit": 5,
        },
    )
    assert create_res.status_code == 201, create_res.text
    disc_data = create_res.json()
    assert disc_data["code"] == "SUMMER10"
    disc_id = disc_data["id"]

    # Duplicate code fails 409
    dup_res = client.post(
        "/api/v1/discounts",
        headers=admin_headers,
        json={
            "name": "Another",
            "code": "summer10",  # uppercase normalization
            "type": "percentage",
            "value": "5.00",
        },
    )
    assert dup_res.status_code == 409

    # Staff can list
    list_res = client.get("/api/v1/discounts?search=SUMMER", headers=staff_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()["items"]) >= 1

    # Customer forbidden
    assert client.get("/api/v1/discounts", headers=customer_a_headers).status_code == 403

    # Admin updates
    update_res = client.put(
        f"/api/v1/discounts/{disc_id}",
        headers=admin_headers,
        json={"name": "Summer 15%", "value": "15.00"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["value"] == "15.00"

    # Soft delete
    del_res = client.delete(f"/api/v1/discounts/{disc_id}", headers=admin_headers)
    assert del_res.status_code == 204


def test_quotation_templates_crud(client: TestClient, admin_headers, staff_headers, db_session: Session):
    prod = Product(name="Cloud Storage", base_price=Decimal("100.00"), is_active=True)
    db_session.add(prod)
    db_session.commit()
    db_session.refresh(prod)

    # Create template
    res = client.post(
        "/api/v1/quotation-templates",
        headers=staff_headers,
        json={
            "name": "Standard Cloud Bundle",
            "description": "Basic bundle",
            "validity_days": 15,
            "items": [
                {
                    "product_id": str(prod.id),
                    "quantity": 2,
                    "unit_price": "100.00",
                }
            ],
        },
    )
    assert res.status_code == 201, res.text
    tpl = res.json()
    assert len(tpl["items"]) == 1
    assert tpl["items"][0]["description"] == "Cloud Storage"
    tpl_id = tpl["id"]

    # Get by id
    get_res = client.get(f"/api/v1/quotation-templates/{tpl_id}", headers=staff_headers)
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Standard Cloud Bundle"

    # Update template
    put_res = client.put(
        f"/api/v1/quotation-templates/{tpl_id}",
        headers=admin_headers,
        json={"validity_days": 45},
    )
    assert put_res.status_code == 200
    assert put_res.json()["validity_days"] == 45

    # Delete template
    del_res = client.delete(f"/api/v1/quotation-templates/{tpl_id}", headers=admin_headers)
    assert del_res.status_code == 204


def test_subscription_lifecycle_and_customer_isolation(
    client: TestClient, admin_headers, staff_headers, customer_a, customer_a_headers, customer_b, customer_b_headers, db_session: Session
):
    prod = Product(name="Email SaaS", base_price=Decimal("50.00"), is_active=True)
    db_session.add(prod)
    db_session.commit()

    plan = Plan(
        name="Email Monthly",
        billing_period="monthly",
        price=Decimal("50.00"),
        duration_periods=12,
        auto_close=True,
        product_id=prod.id,
        is_active=True,
    )
    db_session.add(plan)
    db_session.commit()
    db_session.refresh(plan)

    # 1. Staff creates subscription for customer_a
    sub_res = client.post(
        "/api/v1/subscriptions",
        headers=staff_headers,
        json={
            "customer_id": str(customer_a.id),
            "plan_id": str(plan.id),
            "notes": "Test subscription",
        },
    )
    assert sub_res.status_code == 201, sub_res.text
    sub_data = sub_res.json()
    assert sub_data["status"] == "draft"
    assert sub_data["customer"]["id"] == str(customer_a.id)
    sub_id = sub_data["id"]

    # 2. Customer A can see their own subscription
    get_own = client.get(f"/api/v1/subscriptions/{sub_id}", headers=customer_a_headers)
    assert get_own.status_code == 200
    assert get_own.json()["id"] == sub_id

    # 3. Customer B cannot see Customer A's subscription -> 404 NOT_FOUND!
    get_other = client.get(f"/api/v1/subscriptions/{sub_id}", headers=customer_b_headers)
    assert get_other.status_code == 404
    assert get_other.json()["error"]["code"] == "NOT_FOUND"

    # 4. Customer B listing subscriptions does NOT contain Customer A's subscription
    list_b = client.get("/api/v1/subscriptions", headers=customer_b_headers)
    assert list_b.status_code == 200
    assert not any(s["id"] == sub_id for s in list_b.json()["items"])

    # 5. Lifecycle: draft -> send-quotation -> quotation
    res_quot = client.post(f"/api/v1/subscriptions/{sub_id}/send-quotation", headers=staff_headers)
    assert res_quot.status_code == 200
    assert res_quot.json()["status"] == "quotation"

    # 6. quotation -> confirm -> confirmed
    res_conf = client.post(f"/api/v1/subscriptions/{sub_id}/confirm", headers=staff_headers)
    assert res_conf.status_code == 200
    assert res_conf.json()["status"] == "confirmed"

    # Cannot edit when confirmed
    put_blocked = client.put(f"/api/v1/subscriptions/{sub_id}", headers=staff_headers, json={"notes": "new"})
    assert put_blocked.status_code == 409
    assert put_blocked.json()["error"]["code"] == "INVALID_TRANSITION"

    # 7. confirmed -> activate -> active
    today_str = date.today().isoformat()
    res_act = client.post(
        f"/api/v1/subscriptions/{sub_id}/activate",
        headers=staff_headers,
        json={"start_date": today_str},
    )
    assert res_act.status_code == 200
    act_data = res_act.json()
    assert act_data["status"] == "active"
    assert act_data["start_date"] == today_str
    assert act_data["next_billing_date"] == today_str
    assert act_data["end_date"] is not None

    # 8. active -> pause -> paused
    res_pause = client.post(f"/api/v1/subscriptions/{sub_id}/pause", headers=staff_headers)
    assert res_pause.status_code == 200
    assert res_pause.json()["status"] == "paused"

    # 9. paused -> resume -> active
    res_res = client.post(f"/api/v1/subscriptions/{sub_id}/resume", headers=staff_headers)
    assert res_res.status_code == 200
    assert res_res.json()["status"] == "active"

    # 10. active -> close -> closed
    res_close = client.post(f"/api/v1/subscriptions/{sub_id}/close", headers=staff_headers)
    assert res_close.status_code == 200
    assert res_close.json()["status"] == "closed"

    # 11. renew creates a new draft subscription copy
    res_renew = client.post(f"/api/v1/subscriptions/{sub_id}/renew", headers=staff_headers)
    assert res_renew.status_code == 201
    renewed_sub = res_renew.json()
    assert renewed_sub["status"] == "draft"
    assert renewed_sub["id"] != sub_id
    assert renewed_sub["plan"]["id"] == str(plan.id)


def test_invoice_generation_duplicate_billing_and_payment_flow(
    client: TestClient, admin_headers, staff_headers, customer_a, customer_a_headers, customer_b_headers, db_session: Session
):
    prod = Product(name="Bright CRM", base_price=Decimal("1000.00"), is_active=True)
    db_session.add(prod)
    tax = Tax(name="VAT 10%", rate=Decimal("10.00"), is_active=True)
    db_session.add(tax)
    disc = Discount(
        name="Flat 100",
        code="FLAT100",
        type="fixed",
        value=Decimal("100.00"),
        min_amount=Decimal("500.00"),
        usage_limit=10,
        is_active=True,
    )
    db_session.add(disc)
    db_session.commit()

    plan = Plan(
        name="CRM Yearly",
        billing_period="yearly",
        price=Decimal("1000.00"),
        product_id=prod.id,
        is_active=True,
    )
    db_session.add(plan)
    db_session.commit()

    # Create & activate subscription
    sub_res = client.post(
        "/api/v1/subscriptions",
        headers=admin_headers,
        json={
            "customer_id": str(customer_a.id),
            "plan_id": str(plan.id),
            "tax_id": str(tax.id),
            "discount_id": str(disc.id),
        },
    )
    sub_id = sub_res.json()["id"]
    client.post(f"/api/v1/subscriptions/{sub_id}/confirm", headers=admin_headers)
    today_str = date.today().isoformat()
    client.post(
        f"/api/v1/subscriptions/{sub_id}/activate",
        headers=admin_headers,
        json={"start_date": today_str},
    )

    # 1. Generate invoice
    gen_res = client.post(
        "/api/v1/invoices/generate",
        headers=admin_headers,
        json={"subscription_id": sub_id},
    )
    assert gen_res.status_code == 201, gen_res.text
    inv = gen_res.json()
    assert inv["status"] == "draft"
    # Subtotal 1000.00 - Discount 100.00 = 900.00, Tax 10% on 900.00 = 90.00, Total = 990.00
    assert inv["subtotal"] == "1000.00"
    assert inv["discount_amount"] == "100.00"
    assert inv["tax_amount"] == "90.00"
    assert inv["total"] == "990.00"
    assert inv["amount_paid"] == "0.00"
    assert inv["outstanding"] == "990.00"
    inv_id = inv["id"]

    # 2. Duplicate billing check: immediately calling generate again returns 409 NOT_DUE (since next_billing_date advanced)
    # Or if forced for same period, returns 409 DUPLICATE_BILLING
    gen_again = client.post(
        "/api/v1/invoices/generate",
        headers=admin_headers,
        json={"subscription_id": sub_id},
    )
    assert gen_again.status_code == 409
    assert gen_again.json()["error"]["code"] in ("DUPLICATE_BILLING", "NOT_DUE")

    # 3. Customer isolation on invoice:
    # Customer A can view
    get_inv_a = client.get(f"/api/v1/invoices/{inv_id}", headers=customer_a_headers)
    assert get_inv_a.status_code == 200
    assert get_inv_a.json()["id"] == inv_id

    # Customer B cannot view -> 404 NOT_FOUND!
    get_inv_b = client.get(f"/api/v1/invoices/{inv_id}", headers=customer_b_headers)
    assert get_inv_b.status_code == 404
    assert get_inv_b.json()["error"]["code"] == "NOT_FOUND"

    # 4. Cannot pay draft invoice -> 409 INVALID_TRANSITION
    pay_draft = client.post(
        f"/api/v1/invoices/{inv_id}/payments",
        headers=admin_headers,
        json={"amount": "500.00", "method": "card"},
    )
    assert pay_draft.status_code == 409
    assert pay_draft.json()["error"]["code"] == "INVALID_TRANSITION"

    # 5. Confirm invoice -> confirmed
    conf_res = client.post(f"/api/v1/invoices/{inv_id}/confirm", headers=admin_headers)
    assert conf_res.status_code == 200
    assert conf_res.json()["status"] == "confirmed"

    # 6. Payment tests:
    # 6a. Negative/zero amount -> 422
    pay_zero = client.post(
        f"/api/v1/invoices/{inv_id}/payments",
        headers=admin_headers,
        json={"amount": "0.00", "method": "card"},
    )
    assert pay_zero.status_code == 422

    # 6b. Overpayment -> 422 OVERPAYMENT
    pay_over = client.post(
        f"/api/v1/invoices/{inv_id}/payments",
        headers=admin_headers,
        json={"amount": "1500.00", "method": "card"},
    )
    assert pay_over.status_code == 422
    assert pay_over.json()["error"]["code"] == "OVERPAYMENT"

    # 6c. Partial payment: 500.00
    pay_partial = client.post(
        f"/api/v1/invoices/{inv_id}/payments",
        headers=admin_headers,
        json={"amount": "500.00", "method": "upi", "reference": "UPI-001"},
    )
    assert pay_partial.status_code == 201
    pay_data = pay_partial.json()
    assert pay_data["payment"]["amount"] == "500.00"
    assert pay_data["invoice"]["status"] == "partially_paid"
    assert pay_data["invoice"]["amount_paid"] == "500.00"
    assert pay_data["invoice"]["outstanding"] == "490.00"

    # 6d. Cannot cancel invoice with payments -> 409 INVALID_TRANSITION
    cancel_res = client.post(f"/api/v1/invoices/{inv_id}/cancel", headers=admin_headers)
    assert cancel_res.status_code == 409
    assert cancel_res.json()["error"]["code"] == "INVALID_TRANSITION"

    # 6e. Full remaining payment: 490.00 -> invoice status becomes "paid"
    pay_final = client.post(
        f"/api/v1/invoices/{inv_id}/payments",
        headers=admin_headers,
        json={"amount": "490.00", "method": "bank_transfer"},
    )
    assert pay_final.status_code == 201
    assert pay_final.json()["invoice"]["status"] == "paid"
    assert pay_final.json()["invoice"]["outstanding"] == "0.00"

    # 7. Customer isolation on payments list & get
    list_payments_a = client.get("/api/v1/payments", headers=customer_a_headers)
    assert list_payments_a.status_code == 200
    assert len(list_payments_a.json()["items"]) == 2

    payment_id = pay_data["payment"]["id"]
    get_payment_b = client.get(f"/api/v1/payments/{payment_id}", headers=customer_b_headers)
    assert get_payment_b.status_code == 404
    assert get_payment_b.json()["error"]["code"] == "NOT_FOUND"


def test_dashboard_metrics(client: TestClient, admin_headers, staff_headers, customer_a_headers):
    # Customer forbidden
    assert client.get("/api/v1/dashboard/summary", headers=customer_a_headers).status_code == 403
    assert client.get("/api/v1/dashboard/revenue-trend", headers=customer_a_headers).status_code == 403

    # Admin summary
    summary_res = client.get("/api/v1/dashboard/summary", headers=admin_headers)
    assert summary_res.status_code == 200
    data = summary_res.json()
    assert "total_revenue" in data
    assert "outstanding_amount" in data
    assert "overdue_amount" in data
    assert "active_subscriptions" in data
    assert "invoices_by_status" in data
    assert "subscriptions_by_status" in data

    # Revenue trend
    trend_res = client.get("/api/v1/dashboard/revenue-trend?months=6", headers=staff_headers)
    assert trend_res.status_code == 200
    points = trend_res.json()["points"]
    assert len(points) == 6
    for pt in points:
        assert "month" in pt
        assert "revenue" in pt


def test_full_demo_flow(client: TestClient, admin_headers, staff_headers, customer_a_headers, db_session: Session):
    """
    Full demo flow per instructions:
    create product/plan/customer -> subscription -> activate -> generate invoice -> pay -> dashboard
    """
    # 1. Create product
    prod_res = client.post(
        "/api/v1/products",
        headers=admin_headers,
        json={"name": "Brightloop Enterprise Suite", "base_price": "2000.00"},
    )
    assert prod_res.status_code == 201
    prod_id = prod_res.json()["id"]

    # 2. Create plan
    plan_res = client.post(
        "/api/v1/plans",
        headers=admin_headers,
        json={
            "name": "Enterprise Annual",
            "billing_period": "yearly",
            "price": "2000.00",
            "duration_periods": 3,
            "auto_close": True,
            "product_id": prod_id,
        },
    )
    assert plan_res.status_code == 201
    plan_id = plan_res.json()["id"]

    # 3. Create customer
    cust_res = client.post(
        "/api/v1/customers",
        headers=staff_headers,
        json={
            "email": "acme_demo_corp@example.com",
            "full_name": "Acme Demo Corp",
            "company_name": "Acme Demo",
        },
    )
    assert cust_res.status_code == 201
    customer_id = cust_res.json()["id"]

    # 4. Create subscription
    sub_res = client.post(
        "/api/v1/subscriptions",
        headers=staff_headers,
        json={
            "customer_id": customer_id,
            "plan_id": plan_id,
            "notes": "Annual subscription demo",
        },
    )
    assert sub_res.status_code == 201
    sub_id = sub_res.json()["id"]

    # 5. Confirm and Activate subscription
    client.post(f"/api/v1/subscriptions/{sub_id}/confirm", headers=staff_headers)
    act_res = client.post(
        f"/api/v1/subscriptions/{sub_id}/activate",
        headers=staff_headers,
        json={"start_date": date.today().isoformat()},
    )
    assert act_res.status_code == 200
    assert act_res.json()["status"] == "active"

    # 6. Generate invoice
    gen_res = client.post(
        "/api/v1/invoices/generate",
        headers=staff_headers,
        json={"subscription_id": sub_id},
    )
    assert gen_res.status_code == 201
    inv_id = gen_res.json()["id"]

    # Confirm invoice so it accepts payment
    client.post(f"/api/v1/invoices/{inv_id}/confirm", headers=staff_headers)

    # 7. Pay invoice
    pay_res = client.post(
        f"/api/v1/invoices/{inv_id}/payments",
        headers=staff_headers,
        json={
            "amount": "2000.00",
            "method": "bank_transfer",
            "reference": "DEMO-PAY-001",
        },
    )
    assert pay_res.status_code == 201
    assert pay_res.json()["invoice"]["status"] == "paid"

    # 8. Verify dashboard reflects revenue and active subscriptions
    dash_res = client.get("/api/v1/dashboard/summary", headers=admin_headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert Decimal(dash_data["total_revenue"]) >= Decimal("2000.00")
    assert dash_data["active_subscriptions"] >= 1
