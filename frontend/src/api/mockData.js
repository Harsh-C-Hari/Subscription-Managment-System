/**
 * Mock data store for Brightloop API fallback
 * Conforms strictly to docs/API_CONTRACT.md shapes and decimal string rules
 */

const STORAGE_KEY = 'brightloop_mock_state_v1';

function getInitialState() {
  const p1 = {
    id: 'prod-001',
    name: 'Brightloop CRM Core',
    description: 'Enterprise telemetry and customer subscription lifecycle orchestrator.',
    base_price: '999.00',
    is_active: true,
    created_at: '2026-10-15T08:00:00Z',
  };

  const p2 = {
    id: 'prod-002',
    name: 'Industrial Sensor Cloud',
    description: 'Hardware-grade edge device logging, metric streams and automated alerts.',
    base_price: '450.00',
    is_active: true,
    created_at: '2026-10-18T10:30:00Z',
  };

  const p3 = {
    id: 'prod-003',
    name: 'Automated Billing Relay',
    description: 'Direct ledger sync, tax computation, and automated recurring invoice dispatch.',
    base_price: '299.00',
    is_active: true,
    created_at: '2026-10-20T14:15:00Z',
  };

  const p4 = {
    id: 'prod-004',
    name: 'Compliance Audit Vault',
    description: 'Cryptographic invoice archive and immutable financial transaction logs.',
    base_price: '180.00',
    is_active: false,
    created_at: '2026-10-22T09:00:00Z',
  };

  const variants = [
    {
      id: 'var-101',
      product_id: 'prod-001',
      name: 'Standard Node',
      sku: 'CRM-STD',
      price_adjustment: '0.00',
      effective_price: '999.00',
      is_active: true,
    },
    {
      id: 'var-102',
      product_id: 'prod-001',
      name: 'Enterprise Matrix',
      sku: 'CRM-ENT',
      price_adjustment: '500.00',
      effective_price: '1499.00',
      is_active: true,
    },
    {
      id: 'var-103',
      product_id: 'prod-001',
      name: 'High Availability Multi-Region',
      sku: 'CRM-HA',
      price_adjustment: '1200.00',
      effective_price: '2199.00',
      is_active: true,
    },
    {
      id: 'var-201',
      product_id: 'prod-002',
      name: '5-Device Sensor Kit',
      sku: 'SNS-05',
      price_adjustment: '0.00',
      effective_price: '450.00',
      is_active: true,
    },
    {
      id: 'var-202',
      product_id: 'prod-002',
      name: '25-Device Industrial Hub',
      sku: 'SNS-25',
      price_adjustment: '600.00',
      effective_price: '1050.00',
      is_active: true,
    },
    {
      id: 'var-301',
      product_id: 'prod-003',
      name: 'Single Currency Engine',
      sku: 'BIL-SGL',
      price_adjustment: '0.00',
      effective_price: '299.00',
      is_active: true,
    },
    {
      id: 'var-302',
      product_id: 'prod-003',
      name: 'Global Multi-Currency Engine',
      sku: 'BIL-GLB',
      price_adjustment: '200.00',
      effective_price: '499.00',
      is_active: true,
    },
  ];

  const plans = [
    {
      id: 'plan-001',
      name: 'CRM Monthly Operations',
      description: 'Standard monthly billing for core CRM instrumentation.',
      billing_period: 'monthly',
      price: '999.00',
      duration_periods: 12,
      auto_close: true,
      product_id: 'prod-001',
      is_active: true,
      created_at: '2026-10-15T09:00:00Z',
    },
    {
      id: 'plan-002',
      name: 'CRM Annual Reserve',
      description: 'Annual discounted subscription with priority maintenance deck.',
      billing_period: 'yearly',
      price: '9990.00',
      duration_periods: 3,
      auto_close: false,
      product_id: 'prod-001',
      is_active: true,
      created_at: '2026-10-16T11:00:00Z',
    },
    {
      id: 'plan-003',
      name: 'Sensor Weekly Stream',
      description: 'High-frequency telemetry logging billed in weekly cycles.',
      billing_period: 'weekly',
      price: '120.00',
      duration_periods: 52,
      auto_close: true,
      product_id: 'prod-002',
      is_active: true,
      created_at: '2026-10-19T13:40:00Z',
    },
    {
      id: 'plan-004',
      name: 'Billing Relay Daily Burst',
      description: 'High-volume seasonal invoice dispatching billed per day.',
      billing_period: 'daily',
      price: '25.00',
      duration_periods: 30,
      auto_close: true,
      product_id: 'prod-003',
      is_active: true,
      created_at: '2026-10-21T15:20:00Z',
    },
    {
      id: 'plan-005',
      name: 'Audit Vault Legacy Plan',
      description: 'Archived tier for cold storage telemetry.',
      billing_period: 'yearly',
      price: '1800.00',
      duration_periods: 5,
      auto_close: true,
      product_id: 'prod-004',
      is_active: false,
      created_at: '2026-10-22T10:00:00Z',
    },
  ];

  const customers = [
    {
      id: 'cust-001',
      email: 'ann@example.com',
      full_name: 'Ann Lee',
      phone: '+1 (555) 019-2834',
      company_name: 'Apex Precision Instruments',
      address: '742 Foundry Bay, Industrial Sector 4',
      role: 'customer',
      is_active: true,
      created_at: '2026-10-10T11:20:00Z',
    },
    {
      id: 'cust-002',
      email: 'marcus@vancetech.io',
      full_name: 'Marcus Vance',
      phone: '+1 (555) 438-9901',
      company_name: 'Vance Avionics & Dynamics',
      address: '102 Turbine Row, Hangar B',
      role: 'customer',
      is_active: true,
      created_at: '2026-10-12T14:45:00Z',
    },
    {
      id: 'cust-003',
      email: 'elena@rostovalabs.org',
      full_name: 'Elena Rostova',
      phone: '+1 (555) 762-1144',
      company_name: 'Rostova Research Fabrication',
      address: '88 Chassis Terminal, Complex 9',
      role: 'customer',
      is_active: true,
      created_at: '2026-10-14T09:15:00Z',
    },
    {
      id: 'cust-004',
      email: 'david@kimlogistics.net',
      full_name: 'David Kim',
      phone: '+1 (555) 883-2210',
      company_name: 'Kim Heavy Transport Co.',
      address: '15 Freight Pier, South Terminal',
      role: 'customer',
      is_active: true,
      created_at: '2026-10-16T16:30:00Z',
    },
    {
      id: 'cust-005',
      email: 'sarah.connor@cyberdynesys.com',
      full_name: 'Sarah Connor',
      phone: '+1 (555) 304-9982',
      company_name: 'Cyberdyne Defense Solutions',
      address: 'Sub-level 3, Automated Storage',
      role: 'customer',
      is_active: false,
      created_at: '2026-10-18T12:00:00Z',
    },
  ];

  const users = [
    {
      id: 'usr-admin-01',
      email: 'admin@brightloop.com',
      full_name: 'Lead Instrument Operator',
      company_name: 'Brightloop Core Systems',
      phone: '+1 (800) 555-0199',
      address: 'Central Chassis Bay, Control Deck 1',
      role: 'admin',
      is_active: true,
      created_at: '2026-10-01T00:00:00Z',
    },
    {
      id: 'usr-staff-01',
      email: 'staff@brightloop.com',
      full_name: 'Technician First Class',
      company_name: 'Brightloop Support',
      phone: '+1 (800) 555-0188',
      address: 'Station 2B, Maintenance Bay',
      role: 'staff',
      is_active: true,
      created_at: '2026-10-02T00:00:00Z',
    },
    ...customers,
  ];

  return {
    products: [p1, p2, p3, p4],
    variants,
    plans,
    customers,
    users,
  };
}

export function loadMockState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse mock state from localStorage', e);
  }
  const initial = getInitialState();
  saveMockState(initial);
  return initial;
}

export function saveMockState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save mock state to localStorage', e);
  }
}

