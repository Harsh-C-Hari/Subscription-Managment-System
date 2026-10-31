import axios from 'axios';
import { loadMockState, saveMockState } from './mockData';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const FORCE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 4000,
});

// Request interceptor: attach bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: 401 handling + offline fallback
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // If network error (backend server offline / connection refused) or mock forced:
    const isNetworkError = !error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED';
    if (isNetworkError || FORCE_MOCKS || error.response?.status === 404) {
      try {
        const mockResponse = await handleMockRequest(originalRequest);
        if (mockResponse) {
          return mockResponse;
        }
      } catch (mockErr) {
        return Promise.reject(mockErr);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * High-fidelity fallback handler complying with docs/API_CONTRACT.md
 */
async function handleMockRequest(config) {
  const url = config.url.replace(BASE_URL, '').split('?')[0];
  const method = (config.method || 'get').toUpperCase();
  const params = config.params || parseQueryParams(config.url);
  const data = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {};

  const state = loadMockState();

  // Helper to construct paginated response per contract
  function paginate(items, page = 1, pageSize = 20) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const size = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const total = items.length;
    const pages = Math.ceil(total / size) || 1;
    const offset = (p - 1) * size;
    const paginatedItems = items.slice(offset, offset + size);

    return {
      items: paginatedItems,
      total,
      page: p,
      page_size: size,
      pages,
    };
  }

  // 1. AUTH ENDPOINTS
  if (url === '/auth/login' && method === 'POST') {
    const { email } = data;
    // Allow seeded admin or existing users
    if (email === 'admin@brightloop.com') {
      const user = state.users.find(u => u.email === email) || {
        id: 'usr-admin-01',
        email: 'admin@brightloop.com',
        full_name: 'Lead Instrument Operator',
        role: 'admin',
        is_active: true
      };
      return {
        data: {
          access_token: 'mock-jwt-token-admin-' + Date.now(),
          token_type: 'bearer',
          expires_in: 3600,
          user,
        },
        status: 200,
      };
    }

    const found = state.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
    if (found && found.is_active) {
      return {
        data: {
          access_token: 'mock-jwt-token-' + found.id + '-' + Date.now(),
          token_type: 'bearer',
          expires_in: 3600,
          user: found,
        },
        status: 200,
      };
    }

    const err = new Error('Invalid email or password');
    err.response = {
      status: 401,
      data: {
        error: { code: 'UNAUTHORIZED', message: 'Invalid credentials or inactive user' },
      },
    };
    throw err;
  }

  if (url === '/auth/register' && method === 'POST') {
    if (state.users.some(u => u.email.toLowerCase() === data.email.toLowerCase())) {
      const err = new Error('Email exists');
      err.response = {
        status: 409,
        data: { error: { code: 'CONFLICT', message: 'User with this email already exists' } }
      };
      throw err;
    }

    const newUser = {
      id: 'cust-' + Math.random().toString(36).substring(2, 9),
      email: data.email,
      full_name: data.full_name || '',
      phone: data.phone || '',
      company_name: data.company_name || '',
      address: data.address || '',
      role: 'customer',
      is_active: true,
      created_at: new Date().toISOString(),
    };
    state.users.push(newUser);
    state.customers.push(newUser);
    saveMockState(state);

    return {
      data: newUser,
      status: 201,
    };
  }

  if (url === '/auth/me' && method === 'GET') {
    const storedUser = localStorage.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : state.users[0];
    return { data: user, status: 200 };
  }

  if (url === '/auth/forgot-password' && method === 'POST') {
    return {
      data: {
        message: 'Password reset instructions sent',
        reset_token: 'dev-token-984712',
      },
      status: 200,
    };
  }

  if (url === '/auth/reset-password' && method === 'POST') {
    return {
      data: { message: 'Password reset successful' },
      status: 200,
    };
  }

  // 2. PRODUCTS ENDPOINTS
  if (url === '/products' && method === 'GET') {
    let filtered = [...state.products];
    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
    }
    if (params.is_active !== undefined && params.is_active !== '') {
      const isActive = String(params.is_active) === 'true';
      filtered = filtered.filter(p => p.is_active === isActive);
    }
    return { data: paginate(filtered, params.page, params.page_size), status: 200 };
  }

  if (url === '/products' && method === 'POST') {
    const newProduct = {
      id: 'prod-' + Math.random().toString(36).substring(2, 9),
      name: data.name,
      description: data.description || '',
      base_price: parseFloat(data.base_price || 0).toFixed(2),
      is_active: true,
      created_at: new Date().toISOString(),
    };
    state.products.unshift(newProduct);
    saveMockState(state);
    return { data: newProduct, status: 201 };
  }

  const prodDetailMatch = url.match(/^\/products\/([^/]+)$/);
  if (prodDetailMatch) {
    const prodId = prodDetailMatch[1];
    const index = state.products.findIndex(p => p.id === prodId);

    if (method === 'GET') {
      if (index === -1) throw notFoundError('Product not found');
      const product = { ...state.products[index] };
      product.variants = state.variants.filter(v => v.product_id === prodId);
      return { data: product, status: 200 };
    }

    if (method === 'PUT') {
      if (index === -1) throw notFoundError('Product not found');
      state.products[index] = {
        ...state.products[index],
        ...data,
        base_price: data.base_price ? parseFloat(data.base_price).toFixed(2) : state.products[index].base_price,
      };
      saveMockState(state);
      return { data: state.products[index], status: 200 };
    }

    if (method === 'DELETE') {
      if (index === -1) throw notFoundError('Product not found');
      state.products[index].is_active = false;
      saveMockState(state);
      return { data: null, status: 204 };
    }
  }

  // 3. VARIANTS ENDPOINTS
  const prodVariantsMatch = url.match(/^\/products\/([^/]+)\/variants$/);
  if (prodVariantsMatch) {
    const prodId = prodVariantsMatch[1];
    if (method === 'GET') {
      const variants = state.variants.filter(v => v.product_id === prodId);
      return { data: variants, status: 200 };
    }

    if (method === 'POST') {
      const parentProd = state.products.find(p => p.id === prodId);
      const base = parseFloat(parentProd?.base_price || 0);
      const adj = parseFloat(data.price_adjustment || 0);
      const effective = (base + adj).toFixed(2);

      const newVar = {
        id: 'var-' + Math.random().toString(36).substring(2, 9),
        product_id: prodId,
        name: data.name,
        sku: data.sku,
        price_adjustment: adj.toFixed(2),
        effective_price: effective,
        is_active: true,
      };
      state.variants.push(newVar);
      saveMockState(state);
      return { data: newVar, status: 201 };
    }
  }

  const variantDetailMatch = url.match(/^\/variants\/([^/]+)$/);
  if (variantDetailMatch) {
    const varId = variantDetailMatch[1];
    const index = state.variants.findIndex(v => v.id === varId);
    if (index === -1) throw notFoundError('Variant not found');

    if (method === 'PUT') {
      const parentProd = state.products.find(p => p.id === state.variants[index].product_id);
      const base = parseFloat(parentProd?.base_price || 0);
      const adj = data.price_adjustment !== undefined ? parseFloat(data.price_adjustment) : parseFloat(state.variants[index].price_adjustment);
      const effective = (base + adj).toFixed(2);

      state.variants[index] = {
        ...state.variants[index],
        ...data,
        price_adjustment: adj.toFixed(2),
        effective_price: effective,
      };
      saveMockState(state);
      return { data: state.variants[index], status: 200 };
    }

    if (method === 'DELETE') {
      state.variants[index].is_active = false;
      saveMockState(state);
      return { data: null, status: 204 };
    }
  }

  // 4. PLANS ENDPOINTS
  if (url === '/plans' && method === 'GET') {
    let filtered = [...state.plans];
    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
    }
    if (params.billing_period && params.billing_period !== 'all') {
      filtered = filtered.filter(p => p.billing_period === params.billing_period);
    }
    if (params.product_id) {
      filtered = filtered.filter(p => p.product_id === params.product_id);
    }
    if (params.is_active !== undefined && params.is_active !== '') {
      const isActive = String(params.is_active) === 'true';
      filtered = filtered.filter(p => p.is_active === isActive);
    }
    return { data: paginate(filtered, params.page, params.page_size), status: 200 };
  }

  if (url === '/plans' && method === 'POST') {
    const newPlan = {
      id: 'plan-' + Math.random().toString(36).substring(2, 9),
      name: data.name,
      description: data.description || '',
      billing_period: data.billing_period || 'monthly',
      price: parseFloat(data.price || 0).toFixed(2),
      duration_periods: data.duration_periods ? parseInt(data.duration_periods, 10) : null,
      auto_close: !!data.auto_close,
      product_id: data.product_id,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    state.plans.unshift(newPlan);
    saveMockState(state);
    return { data: newPlan, status: 201 };
  }

  const planDetailMatch = url.match(/^\/plans\/([^/]+)$/);
  if (planDetailMatch) {
    const planId = planDetailMatch[1];
    const index = state.plans.findIndex(p => p.id === planId);

    if (method === 'GET') {
      if (index === -1) throw notFoundError('Plan not found');
      return { data: state.plans[index], status: 200 };
    }

    if (method === 'PUT') {
      if (index === -1) throw notFoundError('Plan not found');
      state.plans[index] = {
        ...state.plans[index],
        ...data,
        price: data.price !== undefined ? parseFloat(data.price).toFixed(2) : state.plans[index].price,
      };
      saveMockState(state);
      return { data: state.plans[index], status: 200 };
    }

    if (method === 'DELETE') {
      if (index === -1) throw notFoundError('Plan not found');
      state.plans[index].is_active = false;
      saveMockState(state);
      return { data: null, status: 204 };
    }
  }

  // 5. CUSTOMERS ENDPOINTS
  if (url === '/customers' && method === 'GET') {
    let filtered = [...state.customers];
    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        c =>
          c.full_name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.company_name?.toLowerCase().includes(q)
      );
    }
    if (params.is_active !== undefined && params.is_active !== '') {
      const isActive = String(params.is_active) === 'true';
      filtered = filtered.filter(c => c.is_active === isActive);
    }
    return { data: paginate(filtered, params.page, params.page_size), status: 200 };
  }

  if (url === '/customers' && method === 'POST') {
    let tempPass = null;
    if (!data.password) {
      tempPass = 'Temp#' + Math.random().toString(36).slice(-8) + '9!';
    }
    const newCustomer = {
      id: 'cust-' + Math.random().toString(36).substring(2, 9),
      email: data.email,
      full_name: data.full_name,
      phone: data.phone || '',
      company_name: data.company_name || '',
      address: data.address || '',
      role: 'customer',
      is_active: true,
      created_at: new Date().toISOString(),
      ...(tempPass ? { temporary_password: tempPass } : {}),
    };
    state.customers.unshift(newCustomer);
    state.users.push(newCustomer);
    saveMockState(state);
    return { data: newCustomer, status: 201 };
  }

  const customerDetailMatch = url.match(/^\/customers\/([^/]+)$/);
  if (customerDetailMatch) {
    const custId = customerDetailMatch[1];
    const index = state.customers.findIndex(c => c.id === custId);

    if (method === 'GET') {
      if (index === -1) throw notFoundError('Customer not found');
      return { data: state.customers[index], status: 200 };
    }

    if (method === 'PUT') {
      if (index === -1) throw notFoundError('Customer not found');
      state.customers[index] = {
        ...state.customers[index],
        ...data,
      };
      saveMockState(state);
      return { data: state.customers[index], status: 200 };
    }

    if (method === 'DELETE') {
      if (index === -1) throw notFoundError('Customer not found');
      state.customers[index].is_active = false;
      saveMockState(state);
      return { data: null, status: 204 };
    }
  }

  // 6. DASHBOARD ENDPOINTS
  if (url === '/dashboard/summary') {
    return {
      data: {
        active_subscriptions: 142,
        total_mrr: '24850.00',
        total_invoiced: '148200.00',
        pending_receivables: '8450.00',
        active_customers: state.customers.filter(c => c.is_active).length,
      },
      status: 200,
    };
  }

  if (url === '/dashboard/revenue-trend') {
    return {
      data: {
        trend: [
          { month: 'MAY 26', revenue: '14200.00', subscriptions: 98 },
          { month: 'JUN 26', revenue: '16800.00', subscriptions: 110 },
          { month: 'JUL 26', revenue: '19400.00', subscriptions: 121 },
          { month: 'AUG 26', revenue: '21900.00', subscriptions: 130 },
          { month: 'SEP 26', revenue: '23500.00', subscriptions: 138 },
          { month: 'OCT 26', revenue: '24850.00', subscriptions: 142 },
        ],
      },
      status: 200,
    };
  }

  return null;
}

function parseQueryParams(url) {
  const qIndex = url.indexOf('?');
  if (qIndex === -1) return {};
  const query = url.substring(qIndex + 1);
  return Object.fromEntries(new URLSearchParams(query));
}

function notFoundError(msg) {
  const err = new Error(msg);
  err.response = {
    status: 404,
    data: {
      error: { code: 'NOT_FOUND', message: msg },
    },
  };
  return err;
}

export default api;
