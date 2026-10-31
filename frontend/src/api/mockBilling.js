/**
 * High-fidelity Mock State & Handlers for Billing & Invoicing (Person 4)
 * Strict conformance to docs/API_CONTRACT.md sections 7-13
 */

const STORAGE_KEY = 'brightloop_billing_mock_state_v1';

function getInitialMockState() {
  return {
    taxes: [
      { id: 'tax-gst-18', name: 'GST (Goods & Services Tax)', rate: '18.00', is_active: true },
      { id: 'tax-vat-10', name: 'Standard VAT', rate: '10.00', is_active: true },
      { id: 'tax-zero-00', name: 'Zero Rated Tax', rate: '0.00', is_active: true },
      { id: 'tax-cal-08', name: 'California State Tax', rate: '8.25', is_active: false },
    ],
    discounts: [
      {
        id: 'disc-launch-10',
        name: 'Launch Discount 10%',
        code: 'LAUNCH10',
        type: 'percentage',
        value: '10.00',
        min_amount: '0.00',
        valid_from: '2026-01-01',
        valid_until: '2026-12-31',
        usage_limit: 500,
        used_count: 42,
        is_active: true,
      },
      {
        id: 'disc-fixed-50',
        name: 'Early Adopter Voucher $50',
        code: 'EARLY50',
        type: 'fixed',
        value: '50.00',
        min_amount: '200.00',
        valid_from: '2026-01-01',
        valid_until: '2026-12-31',
        usage_limit: 100,
        used_count: 18,
        is_active: true,
      },
      {
        id: 'disc-vip-20',
        name: 'Enterprise VIP Tier 20%',
        code: 'ENTERPRISE20',
        type: 'percentage',
        value: '20.00',
        min_amount: '1000.00',
        valid_from: '2026-01-01',
        valid_until: '2026-12-31',
        usage_limit: 25,
        used_count: 5,
        is_active: true,
      },
    ],
    templates: [
      {
        id: 'tmpl-crm-standard',
        name: 'Standard Cloud CRM Package',
        description: 'Standard seat setup with high-throughput relational analytics and monitoring node.',
        plan_id: 'plan-01',
        validity_days: 30,
        is_active: true,
        items: [
          {
            id: 'item-t1',
            product_id: 'prod-01',
            variant_id: null,
            description: 'Cloud CRM Master License Node',
            quantity: 2,
            unit_price: '999.00',
          },
          {
            id: 'item-t2',
            product_id: 'prod-02',
            variant_id: null,
            description: 'Telemetric Data Stream Hub',
            quantity: 1,
            unit_price: '450.00',
          },
        ],
      },
      {
        id: 'tmpl-hardware-cluster',
        name: 'Industrial Sensor Fleet Bundle',
        description: 'Comprehensive edge telemetry node cluster with 24/7 logging chassis.',
        plan_id: 'plan-02',
        validity_days: 15,
        is_active: true,
        items: [
          {
            id: 'item-t3',
            product_id: 'prod-03',
            variant_id: null,
            description: 'Edge Gateway Telemetry Enclosure',
            quantity: 5,
            unit_price: '299.00',
          },
        ],
      },
    ],
    subscriptions: [
      {
        id: 'sub-0001',
        subscription_number: 'SUB-2026-000001',
        status: 'active',
        customer: { id: 'cust-ann-01', full_name: 'Ann Lee', email: 'ann@example.com' },
        plan: { id: 'plan-01', name: 'CRM Monthly Pro', billing_period: 'monthly' },
        tax: { id: 'tax-gst-18', name: 'GST (Goods & Services Tax)', rate: '18.00' },
        discount: { id: 'disc-launch-10', name: 'Launch Discount 10%', code: 'LAUNCH10', type: 'percentage', value: '10.00' },
        items: [
          {
            id: 'sitem-01',
            product_id: 'prod-01',
            variant_id: null,
            description: 'Brightloop CRM Core Seat',
            quantity: 2,
            unit_price: '999.00',
            line_total: '1998.00',
          },
        ],
        start_date: '2026-10-01',
        end_date: '2027-10-01',
        next_billing_date: '2026-11-01',
        billing_anchor_day: 1,
        notes: 'Priority industrial telemetry SLA tier.',
        created_at: '2026-10-01T09:00:00Z',
      },
      {
        id: 'sub-0002',
        subscription_number: 'SUB-2026-000002',
        status: 'draft',
        customer: { id: 'cust-acme-02', full_name: 'Acme Operations Corp', email: 'billing@acme.org' },
        plan: { id: 'plan-02', name: 'Enterprise Fleet Annual', billing_period: 'yearly' },
        tax: { id: 'tax-vat-10', name: 'Standard VAT', rate: '10.00' },
        discount: null,
        items: [
          {
            id: 'sitem-02',
            product_id: 'prod-02',
            variant_id: null,
            description: 'Enterprise Central Relay Subsystem',
            quantity: 1,
            unit_price: '9990.00',
            line_total: '9990.00',
          },
        ],
        start_date: null,
        end_date: null,
        next_billing_date: null,
        billing_anchor_day: null,
        notes: 'Pending quotation dispatch to procurement officer.',
        created_at: '2026-10-31T08:15:00Z',
      },
      {
        id: 'sub-0003',
        subscription_number: 'SUB-2026-000003',
        status: 'quotation',
        customer: { id: 'cust-wayne-03', full_name: 'Bruce Wayne', email: 'bruce@wayneenterprises.com' },
        plan: { id: 'plan-01', name: 'Hardware Node Tier', billing_period: 'monthly' },
        tax: { id: 'tax-gst-18', name: 'GST (Goods & Services Tax)', rate: '18.00' },
        discount: { id: 'disc-vip-20', name: 'Enterprise VIP Tier 20%', code: 'ENTERPRISE20', type: 'percentage', value: '20.00' },
        items: [
          {
            id: 'sitem-03',
            product_id: 'prod-03',
            variant_id: null,
            description: 'Edge Gateway Telemetry Enclosure',
            quantity: 10,
            unit_price: '450.00',
            line_total: '4500.00',
          },
        ],
        start_date: null,
        end_date: null,
        next_billing_date: null,
        billing_anchor_day: null,
        notes: 'Quotation dispatched for executive confirmation.',
        created_at: '2026-10-28T11:45:00Z',
      },
      {
        id: 'sub-0004',
        subscription_number: 'SUB-2026-000004',
        status: 'confirmed',
        customer: { id: 'cust-cyber-04', full_name: 'Miles Dyson', email: 'mdyson@cyberdyne.io' },
        plan: { id: 'plan-01', name: 'AI Neural Matrix', billing_period: 'monthly' },
        tax: null,
        discount: null,
        items: [
          {
            id: 'sitem-04',
            product_id: 'prod-01',
            variant_id: null,
            description: 'Neural Co-Processor Cluster Node',
            quantity: 1,
            unit_price: '1200.00',
            line_total: '1200.00',
          },
        ],
        start_date: null,
        end_date: null,
        next_billing_date: null,
        billing_anchor_day: null,
        notes: 'Confirmed by legal department; awaiting activation schedule.',
        created_at: '2026-10-25T14:20:00Z',
      },
      {
        id: 'sub-0005',
        subscription_number: 'SUB-2026-000005',
        status: 'paused',
        customer: { id: 'cust-stark-05', full_name: 'Tony Stark', email: 'tony@stark.industries' },
        plan: { id: 'plan-01', name: 'Reactor Telemetry Node', billing_period: 'monthly' },
        tax: { id: 'tax-gst-18', name: 'GST (Goods & Services Tax)', rate: '18.00' },
        discount: null,
        items: [
          {
            id: 'sitem-05',
            product_id: 'prod-02',
            variant_id: null,
            description: 'Arc Sensor Array License',
            quantity: 2,
            unit_price: '1700.00',
            line_total: '3400.00',
          },
        ],
        start_date: '2026-08-01',
        end_date: null,
        next_billing_date: '2026-11-01',
        billing_anchor_day: 1,
        notes: 'Temporarily halted during lab hardware maintenance.',
        created_at: '2026-08-01T10:00:00Z',
      },
      {
        id: 'sub-0006',
        subscription_number: 'SUB-2026-000006',
        status: 'closed',
        customer: { id: 'cust-omni-06', full_name: 'Omni Consumer Products', email: 'admin@ocp.corp' },
        plan: { id: 'plan-01', name: 'Legacy Security Suite', billing_period: 'monthly' },
        tax: null,
        discount: null,
        items: [
          {
            id: 'sitem-06',
            product_id: 'prod-01',
            variant_id: null,
            description: 'ED-209 Diagnostics Module',
            quantity: 1,
            unit_price: '800.00',
            line_total: '800.00',
          },
        ],
        start_date: '2026-01-01',
        end_date: '2026-06-30',
        next_billing_date: null,
        billing_anchor_day: 1,
        notes: 'Contract term completed; eligible for renewal.',
        created_at: '2026-01-01T08:00:00Z',
      },
    ],
    invoices: [
      {
        id: 'inv-0001',
        invoice_number: 'INV-2026-000001',
        status: 'confirmed',
        subscription_id: 'sub-0001',
        subscription_number: 'SUB-2026-000001',
        customer: { id: 'cust-ann-01', full_name: 'Ann Lee', email: 'ann@example.com' },
        period_start: '2026-10-01',
        period_end: '2026-10-31',
        issue_date: '2026-10-01',
        due_date: '2026-10-15',
        items: [
          {
            id: 'inv-item-01',
            description: 'Brightloop CRM Core Seat',
            quantity: 2,
            unit_price: '999.00',
            line_total: '1998.00',
          },
        ],
        subtotal: '1998.00',
        discount_amount: '199.80',
        tax_rate: '18.00',
        tax_amount: '323.68',
        total: '2121.88',
        amount_paid: '0.00',
        outstanding: '2121.88',
        is_overdue: true,
        payments: [],
      },
      {
        id: 'inv-0002',
        invoice_number: 'INV-2026-000002',
        status: 'paid',
        subscription_id: 'sub-0003',
        subscription_number: 'SUB-2026-000003',
        customer: { id: 'cust-wayne-03', full_name: 'Bruce Wayne', email: 'bruce@wayneenterprises.com' },
        period_start: '2026-09-01',
        period_end: '2026-09-30',
        issue_date: '2026-09-01',
        due_date: '2026-09-15',
        items: [
          {
            id: 'inv-item-02',
            description: 'Edge Gateway Telemetry Enclosure',
            quantity: 10,
            unit_price: '450.00',
            line_total: '4500.00',
          },
        ],
        subtotal: '4500.00',
        discount_amount: '900.00',
        tax_rate: '18.00',
        tax_amount: '648.00',
        total: '4248.00',
        amount_paid: '4248.00',
        outstanding: '0.00',
        is_overdue: false,
        payments: [
          {
            id: 'pay-0001',
            invoice_id: 'inv-0002',
            customer_id: 'cust-wayne-03',
            amount: '4248.00',
            method: 'bank_transfer',
            reference: 'WIRE-8839210-WAYNE',
            paid_at: '2026-09-05T14:30:00Z',
            notes: 'Settled via Wayne Enterprises Accounts Payable',
          },
        ],
      },
      {
        id: 'inv-0003',
        invoice_number: 'INV-2026-000003',
        status: 'partially_paid',
        subscription_id: 'sub-0004',
        subscription_number: 'SUB-2026-000004',
        customer: { id: 'cust-cyber-04', full_name: 'Miles Dyson', email: 'mdyson@cyberdyne.io' },
        period_start: '2026-10-10',
        period_end: '2026-11-09',
        issue_date: '2026-10-10',
        due_date: '2026-10-24',
        items: [
          {
            id: 'inv-item-03',
            description: 'Neural Co-Processor Cluster Node',
            quantity: 1,
            unit_price: '1200.00',
            line_total: '1200.00',
          },
        ],
        subtotal: '1200.00',
        discount_amount: '0.00',
        tax_rate: '18.00',
        tax_amount: '216.00',
        total: '1416.00',
        amount_paid: '500.00',
        outstanding: '916.00',
        is_overdue: true,
        payments: [
          {
            id: 'pay-0002',
            invoice_id: 'inv-0003',
            customer_id: 'cust-cyber-04',
            amount: '500.00',
            method: 'card',
            reference: 'AUTH-99120-CYBER',
            paid_at: '2026-10-12T09:15:00Z',
            notes: 'Advance installment',
          },
        ],
      },
      {
        id: 'inv-0004',
        invoice_number: 'INV-2026-000004',
        status: 'draft',
        subscription_id: 'sub-0002',
        subscription_number: 'SUB-2026-000002',
        customer: { id: 'cust-acme-02', full_name: 'Acme Operations Corp', email: 'billing@acme.org' },
        period_start: '2026-10-31',
        period_end: '2027-10-30',
        issue_date: '2026-10-31',
        due_date: '2026-11-14',
        items: [
          {
            id: 'inv-item-04',
            description: 'Enterprise Central Relay Subsystem',
            quantity: 1,
            unit_price: '9990.00',
            line_total: '9990.00',
          },
        ],
        subtotal: '9990.00',
        discount_amount: '0.00',
        tax_rate: '10.00',
        tax_amount: '999.00',
        total: '10989.00',
        amount_paid: '0.00',
        outstanding: '10989.00',
        is_overdue: false,
        payments: [],
      },
    ],
    payments: [
      {
        id: 'pay-0001',
        invoice_id: 'inv-0002',
        invoice_number: 'INV-2026-000002',
        customer_id: 'cust-wayne-03',
        customer_name: 'Bruce Wayne',
        amount: '4248.00',
        method: 'bank_transfer',
        reference: 'WIRE-8839210-WAYNE',
        paid_at: '2026-09-05T14:30:00Z',
        notes: 'Settled via Wayne Enterprises Accounts Payable',
      },
      {
        id: 'pay-0002',
        invoice_id: 'inv-0003',
        invoice_number: 'INV-2026-000003',
        customer_id: 'cust-cyber-04',
        customer_name: 'Miles Dyson',
        amount: '500.00',
        method: 'card',
        reference: 'AUTH-99120-CYBER',
        paid_at: '2026-10-12T09:15:00Z',
        notes: 'Advance installment',
      },
    ],
  };
}

export function loadBillingMockState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialMockState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed reading mock billing storage:', err);
    return getInitialMockState();
  }
}

export function saveBillingMockState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed saving mock billing storage:', err);
  }
}

function paginate(items, page = 1, pageSize = 20) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const size = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
  const total = items.length;
  const pages = Math.ceil(total / size) || 1;
  const offset = (p - 1) * size;
  return {
    items: items.slice(offset, offset + size),
    total,
    page: p,
    page_size: size,
    pages,
  };
}

// ----------------- TAXES MOCKS -----------------
export async function mockGetTaxes(params = {}) {
  const state = loadBillingMockState();
  let list = [...state.taxes];
  if (params.is_active !== undefined && params.is_active !== '') {
    const act = String(params.is_active) === 'true';
    list = list.filter((t) => t.is_active === act);
  }
  return { data: list };
}

export async function mockCreateTax(payload) {
  const state = loadBillingMockState();
  const newTax = {
    id: 'tax-' + Math.random().toString(36).substring(2, 8),
    name: payload.name,
    rate: String(payload.rate),
    is_active: payload.is_active !== false,
  };
  state.taxes.unshift(newTax);
  saveBillingMockState(state);
  return { data: newTax };
}

export async function mockUpdateTax(id, payload) {
  const state = loadBillingMockState();
  const idx = state.taxes.findIndex((t) => t.id === id);
  if (idx === -1) throw { response: { data: { error: { code: 'NOT_FOUND', message: 'Tax rate not found' } } } };
  state.taxes[idx] = { ...state.taxes[idx], ...payload };
  saveBillingMockState(state);
  return { data: state.taxes[idx] };
}

export async function mockDeleteTax(id) {
  const state = loadBillingMockState();
  const idx = state.taxes.findIndex((t) => t.id === id);
  if (idx !== -1) {
    state.taxes[idx].is_active = false;
    saveBillingMockState(state);
  }
  return { data: null };
}

// ----------------- DISCOUNTS MOCKS -----------------
export async function mockGetDiscounts(params = {}) {
  const state = loadBillingMockState();
  let list = [...state.discounts];
  if (params.is_active !== undefined && params.is_active !== '') {
    const act = String(params.is_active) === 'true';
    list = list.filter((d) => d.is_active === act);
  }
  if (params.search) {
    const q = params.search.toLowerCase();
    list = list.filter((d) => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q));
  }
  return { data: list };
}

export async function mockCreateDiscount(payload) {
  const state = loadBillingMockState();
  const newDisc = {
    id: 'disc-' + Math.random().toString(36).substring(2, 8),
    name: payload.name,
    code: payload.code.toUpperCase(),
    type: payload.type || 'percentage',
    value: String(payload.value || '0.00'),
    min_amount: String(payload.min_amount || '0.00'),
    valid_from: payload.valid_from || null,
    valid_until: payload.valid_until || null,
    usage_limit: payload.usage_limit ? parseInt(payload.usage_limit, 10) : null,
    used_count: 0,
    is_active: payload.is_active !== false,
  };
  state.discounts.unshift(newDisc);
  saveBillingMockState(state);
  return { data: newDisc };
}

export async function mockUpdateDiscount(id, payload) {
  const state = loadBillingMockState();
  const idx = state.discounts.findIndex((d) => d.id === id);
  if (idx === -1) throw { response: { data: { error: { code: 'NOT_FOUND', message: 'Discount not found' } } } };
  state.discounts[idx] = { ...state.discounts[idx], ...payload };
  saveBillingMockState(state);
  return { data: state.discounts[idx] };
}

export async function mockDeleteDiscount(id) {
  const state = loadBillingMockState();
  const idx = state.discounts.findIndex((d) => d.id === id);
  if (idx !== -1) {
    state.discounts[idx].is_active = false;
    saveBillingMockState(state);
  }
  return { data: null };
}

// ----------------- QUOTATION TEMPLATES MOCKS -----------------
export async function mockGetQuotationTemplates() {
  const state = loadBillingMockState();
  return { data: state.templates.filter((t) => t.is_active !== false) };
}

export async function mockGetQuotationTemplate(id) {
  const state = loadBillingMockState();
  const tmpl = state.templates.find((t) => t.id === id);
  if (!tmpl) throw { response: { data: { error: { code: 'NOT_FOUND', message: 'Quotation template not found' } } } };
  return { data: tmpl };
}

export async function mockCreateQuotationTemplate(payload) {
  const state = loadBillingMockState();
  const newTmpl = {
    id: 'tmpl-' + Math.random().toString(36).substring(2, 8),
    name: payload.name,
    description: payload.description || '',
    plan_id: payload.plan_id || null,
    validity_days: parseInt(payload.validity_days, 10) || 30,
    is_active: true,
    items: (payload.items || []).map((it) => ({
      id: 'item-' + Math.random().toString(36).substring(2, 8),
      product_id: it.product_id,
      variant_id: it.variant_id || null,
      description: it.description || 'Hardware Item',
      quantity: it.quantity || 1,
      unit_price: String(it.unit_price || '0.00'),
    })),
  };
  state.templates.unshift(newTmpl);
  saveBillingMockState(state);
  return { data: newTmpl };
}

export async function mockUpdateQuotationTemplate(id, payload) {
  const state = loadBillingMockState();
  const idx = state.templates.findIndex((t) => t.id === id);
  if (idx === -1) throw { response: { data: { error: { code: 'NOT_FOUND', message: 'Quotation template not found' } } } };
  state.templates[idx] = {
    ...state.templates[idx],
    ...payload,
    items: (payload.items || state.templates[idx].items).map((it) => ({
      id: it.id || 'item-' + Math.random().toString(36).substring(2, 8),
      product_id: it.product_id,
      variant_id: it.variant_id || null,
      description: it.description || 'Hardware Item',
      quantity: it.quantity || 1,
      unit_price: String(it.unit_price || '0.00'),
    })),
  };
  saveBillingMockState(state);
  return { data: state.templates[idx] };
}

export async function mockDeleteQuotationTemplate(id) {
  const state = loadBillingMockState();
  const idx = state.templates.findIndex((t) => t.id === id);
  if (idx !== -1) {
    state.templates[idx].is_active = false;
    saveBillingMockState(state);
  }
  return { data: null };
}

// ----------------- SUBSCRIPTIONS MOCKS -----------------
export async function mockGetSubscriptions(params = {}) {
  const state = loadBillingMockState();
  let list = [...state.subscriptions];

  if (params.status) {
    list = list.filter((s) => s.status.toLowerCase() === params.status.toLowerCase());
  }
  if (params.customer_id) {
    list = list.filter((s) => s.customer?.id === params.customer_id);
  }
  if (params.plan_id) {
    list = list.filter((s) => s.plan?.id === params.plan_id);
  }
  if (params.search) {
    const q = params.search.toLowerCase();
    list = list.filter(
      (s) =>
        s.subscription_number.toLowerCase().includes(q) ||
        s.customer?.full_name?.toLowerCase().includes(q) ||
        s.customer?.email?.toLowerCase().includes(q)
    );
  }

  return { data: paginate(list, params.page, params.page_size) };
}

export async function mockGetSubscription(id) {
  const state = loadBillingMockState();
  const sub = state.subscriptions.find((s) => s.id === id);
  if (!sub) throw { response: { data: { error: { code: 'NOT_FOUND', message: 'Subscription not found' } } } };
  return { data: sub };
}

export async function mockCreateSubscription(payload) {
  const state = loadBillingMockState();
  const subNum = `SUB-2026-${String(state.subscriptions.length + 1).padStart(6, '0')}`;

  const tax = payload.tax_id ? state.taxes.find((t) => t.id === payload.tax_id) : null;
  const discount = payload.discount_id ? state.discounts.find((d) => d.id === payload.discount_id) : null;

  const newSub = {
    id: 'sub-' + Math.random().toString(36).substring(2, 8),
    subscription_number: subNum,
    status: 'draft',
    customer: {
      id: payload.customer_id,
      full_name: payload.customer_name || 'Selected Customer',
      email: payload.customer_email || 'client@telemetry.net',
    },
    plan: {
      id: payload.plan_id,
      name: payload.plan_name || 'Standard Tier Plan',
      billing_period: payload.billing_period || 'monthly',
    },
    tax: tax ? { id: tax.id, name: tax.name, rate: tax.rate } : null,
    discount: discount
      ? { id: discount.id, name: discount.name, code: discount.code, type: discount.type, value: discount.value }
      : null,
    items: (payload.items || []).map((it) => {
      const qty = parseInt(it.quantity, 10) || 1;
      const up = parseFloat(it.unit_price) || 0;
      return {
        id: 'sitem-' + Math.random().toString(36).substring(2, 8),
        product_id: it.product_id,
        variant_id: it.variant_id || null,
        description: it.description || 'Hardware Module Provisioning',
        quantity: qty,
        unit_price: String(it.unit_price || '0.00'),
        line_total: (qty * up).toFixed(2),
      };
    }),
    start_date: null,
    end_date: null,
    next_billing_date: null,
    billing_anchor_day: null,
    notes: payload.notes || '',
    created_at: new Date().toISOString(),
  };

  state.subscriptions.unshift(newSub);
  saveBillingMockState(state);
  return { data: newSub };
}

export async function mockSubscriptionAction(id, action, body = {}) {
  const state = loadBillingMockState();
  const sub = state.subscriptions.find((s) => s.id === id);
  if (!sub) throw { response: { data: { error: { code: 'NOT_FOUND', message: 'Subscription not found' } } } };

  switch (action) {
    case 'send-quotation':
      if (sub.status !== 'draft') {
        throw { response: { data: { error: { code: 'INVALID_TRANSITION', message: 'Cannot send quotation unless in draft state.' } } } };
      }
      sub.status = 'quotation';
      break;

    case 'confirm':
      if (sub.status !== 'draft' && sub.status !== 'quotation') {
        throw { response: { data: { error: { code: 'INVALID_TRANSITION', message: 'Can only confirm draft or quotation subscriptions.' } } } };
      }
      sub.status = 'confirmed';
      break;

    case 'activate': {
      if (sub.status !== 'confirmed') {
        throw { response: { data: { error: { code: 'INVALID_TRANSITION', message: 'Can only activate confirmed subscriptions.' } } } };
      }
      const sDate = body.start_date || new Date().toISOString().split('T')[0];
      sub.status = 'active';
      sub.start_date = sDate;
      sub.next_billing_date = sDate;
      sub.billing_anchor_day = parseInt(sDate.split('-')[2], 10);
      break;
    }

    case 'pause':
      if (sub.status !== 'active') {
        throw { response: { data: { error: { code: 'INVALID_TRANSITION', message: 'Can only pause active subscriptions.' } } } };
      }
      sub.status = 'paused';
      break;

    case 'resume':
      if (sub.status !== 'paused') {
        throw { response: { data: { error: { code: 'INVALID_TRANSITION', message: 'Can only resume paused subscriptions.' } } } };
      }
      sub.status = 'active';
      break;

    case 'close':
      sub.status = 'closed';
      sub.next_billing_date = null;
      break;

    case 'renew': {
      const copyNum = `SUB-2026-${String(state.subscriptions.length + 1).padStart(6, '0')}`;
      const copySub = {
        ...sub,
        id: 'sub-' + Math.random().toString(36).substring(2, 8),
        subscription_number: copyNum,
        status: 'draft',
        start_date: null,
        end_date: null,
        next_billing_date: null,
        created_at: new Date().toISOString(),
      };
      state.subscriptions.unshift(copySub);
      saveBillingMockState(state);
      return { data: copySub };
    }

    default:
      throw new Error(`Unsupported action: ${action}`);
  }

  saveBillingMockState(state);
  return { data: sub };
}

// ----------------- INVOICES MOCKS -----------------
export async function mockGetInvoices(params = {}) {
  const state = loadBillingMockState();
  let list = [...state.invoices];

  if (params.status) {
    list = list.filter((inv) => inv.status.toLowerCase() === params.status.toLowerCase());
  }
  if (params.customer_id) {
    list = list.filter((inv) => inv.customer?.id === params.customer_id);
  }
  if (params.subscription_id) {
    list = list.filter((inv) => inv.subscription_id === params.subscription_id);
  }
  if (params.overdue === true || params.overdue === 'true') {
    list = list.filter((inv) => inv.is_overdue || (inv.status !== 'paid' && new Date(inv.due_date) < new Date()));
  }
  if (params.search) {
    const q = params.search.toLowerCase();
    list = list.filter(
      (inv) =>
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.customer?.full_name?.toLowerCase().includes(q) ||
        inv.subscription_number?.toLowerCase().includes(q)
    );
  }

  return { data: paginate(list, params.page, params.page_size) };
}

export async function mockGetInvoice(id) {
  const state = loadBillingMockState();
  const inv = state.invoices.find((i) => i.id === id);
  if (!inv) throw { response: { data: { error: { code: 'NOT_FOUND', message: 'Invoice not found' } } } };
  return { data: inv };
}

export async function mockGenerateInvoice(subscriptionId) {
  const state = loadBillingMockState();
  const sub = state.subscriptions.find((s) => s.id === subscriptionId);
  if (!sub) throw { response: { data: { error: { code: 'NOT_FOUND', message: 'Subscription not found' } } } };

  if (sub.status !== 'active') {
    throw { response: { data: { error: { code: 'INVALID_TRANSITION', message: 'Subscription must be active to generate invoice.' } } } };
  }

  const invNum = `INV-2026-${String(state.invoices.length + 1).padStart(6, '0')}`;
  const now = new Date();
  const issueDate = now.toISOString().split('T')[0];
  const dueDate = new Date(now.getTime() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0];

  // Calculate subtotal
  let subtotalNum = 0;
  const items = sub.items.map((it) => {
    const total = parseFloat(it.line_total || it.unit_price);
    subtotalNum += total;
    return {
      id: 'inv-item-' + Math.random().toString(36).substring(2, 8),
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unit_price,
      line_total: it.line_total,
    };
  });

  // Calculate discount
  let discountNum = 0;
  if (sub.discount) {
    if (sub.discount.type === 'percentage') {
      discountNum = (subtotalNum * parseFloat(sub.discount.value)) / 100;
    } else {
      discountNum = Math.min(subtotalNum, parseFloat(sub.discount.value));
    }
  }

  // Calculate tax
  let taxNum = 0;
  const taxRate = sub.tax?.rate || '0.00';
  const taxable = Math.max(0, subtotalNum - discountNum);
  if (sub.tax) {
    taxNum = (taxable * parseFloat(taxRate)) / 100;
  }

  const grandTotal = (taxable + taxNum).toFixed(2);

  const newInv = {
    id: 'inv-' + Math.random().toString(36).substring(2, 8),
    invoice_number: invNum,
    status: 'draft',
    subscription_id: sub.id,
    subscription_number: sub.subscription_number,
    customer: sub.customer,
    period_start: issueDate,
    period_end: dueDate,
    issue_date: issueDate,
    due_date: dueDate,
    items,
    subtotal: subtotalNum.toFixed(2),
    discount_amount: discountNum.toFixed(2),
    tax_rate: taxRate,
    tax_amount: taxNum.toFixed(2),
    total: grandTotal,
    amount_paid: '0.00',
    outstanding: grandTotal,
    is_overdue: false,
    payments: [],
  };

  state.invoices.unshift(newInv);
  saveBillingMockState(state);
  return { data: newInv };
}

export async function mockRunBilling(asOfDate) {
  const state = loadBillingMockState();
  const createdInvoices = [];
  const activeSubs = state.subscriptions.filter((s) => s.status === 'active');

  for (const sub of activeSubs) {
    // Generate one if none draft
    const res = await mockGenerateInvoice(sub.id);
    createdInvoices.push({
      subscription_id: sub.id,
      invoice_id: res.data.id,
      invoice_number: res.data.invoice_number,
    });
  }

  return {
    data: {
      as_of_date: asOfDate || new Date().toISOString().split('T')[0],
      created: createdInvoices.length,
      skipped_duplicate: 0,
      skipped_not_due: 0,
      failed: 0,
      invoices: createdInvoices,
      errors: [],
    },
  };
}

export async function mockConfirmInvoice(id) {
  const state = loadBillingMockState();
  const inv = state.invoices.find((i) => i.id === id);
  if (!inv) throw { response: { data: { error: { code: 'NOT_FOUND', message: 'Invoice not found' } } } };
  if (inv.status !== 'draft') {
    throw { response: { data: { error: { code: 'INVALID_TRANSITION', message: 'Only draft invoices can be confirmed.' } } } };
  }
  inv.status = 'confirmed';
  saveBillingMockState(state);
  return { data: inv };
}

export async function mockCancelInvoice(id) {
  const state = loadBillingMockState();
  const inv = state.invoices.find((i) => i.id === id);
  if (!inv) throw { response: { data: { error: { code: 'NOT_FOUND', message: 'Invoice not found' } } } };
  if (inv.amount_paid !== '0.00' && parseFloat(inv.amount_paid) > 0) {
    throw { response: { data: { error: { code: 'INVALID_TRANSITION', message: 'Cannot cancel invoice with recorded payments.' } } } };
  }
  inv.status = 'cancelled';
  saveBillingMockState(state);
  return { data: inv };
}

// ----------------- PAYMENTS MOCKS -----------------
export async function mockRecordPayment(invoiceId, payload) {
  const state = loadBillingMockState();
  const inv = state.invoices.find((i) => i.id === invoiceId);
  if (!inv) throw { response: { data: { error: { code: 'NOT_FOUND', message: 'Invoice not found' } } } };

  if (inv.status !== 'confirmed' && inv.status !== 'partially_paid') {
    throw { response: { data: { error: { code: 'INVALID_TRANSITION', message: 'Can only record payments on confirmed or partially paid invoices.' } } } };
  }

  const payAmt = parseFloat(payload.amount);
  const curOutstanding = parseFloat(inv.outstanding);

  if (payAmt <= 0) {
    throw { response: { data: { error: { code: 'VALIDATION_ERROR', message: 'Payment amount must be greater than zero.' } } } };
  }
  if (payAmt > curOutstanding + 0.0001) {
    throw { response: { data: { error: { code: 'OVERPAYMENT', message: `Overpayment rejected: ${payAmt} exceeds outstanding balance of ${curOutstanding}` } } } };
  }

  const curPaid = parseFloat(inv.amount_paid) + payAmt;
  const newOutstanding = Math.max(0, curOutstanding - payAmt);

  inv.amount_paid = curPaid.toFixed(2);
  inv.outstanding = newOutstanding.toFixed(2);
  inv.status = newOutstanding <= 0.001 ? 'paid' : 'partially_paid';

  const newPayment = {
    id: 'pay-' + Math.random().toString(36).substring(2, 8),
    invoice_id: inv.id,
    invoice_number: inv.invoice_number,
    customer_id: inv.customer.id,
    customer_name: inv.customer.full_name,
    amount: payAmt.toFixed(2),
    method: payload.method || 'card',
    reference: payload.reference || 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
    paid_at: payload.paid_at || new Date().toISOString(),
    notes: payload.notes || '',
  };

  inv.payments = inv.payments || [];
  inv.payments.unshift(newPayment);
  state.payments.unshift(newPayment);

  saveBillingMockState(state);
  return {
    data: {
      payment: newPayment,
      invoice: {
        id: inv.id,
        status: inv.status,
        total: inv.total,
        amount_paid: inv.amount_paid,
        outstanding: inv.outstanding,
      },
    },
  };
}

export async function mockGetPayments(params = {}) {
  const state = loadBillingMockState();
  let list = [...state.payments];

  if (params.invoice_id) {
    list = list.filter((p) => p.invoice_id === params.invoice_id);
  }
  if (params.customer_id) {
    list = list.filter((p) => p.customer_id === params.customer_id);
  }
  if (params.method) {
    list = list.filter((p) => p.method === params.method);
  }

  return { data: paginate(list, params.page, params.page_size) };
}

export async function mockGetPayment(id) {
  const state = loadBillingMockState();
  const pay = state.payments.find((p) => p.id === id);
  if (!pay) throw { response: { data: { error: { code: 'NOT_FOUND', message: 'Payment record not found' } } } };
  return { data: pay };
}
