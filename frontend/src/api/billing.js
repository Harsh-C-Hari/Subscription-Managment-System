import api from './client';
import * as mockBilling from './mockBilling';

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

/**
 * Format API error into user-friendly message per contract:
 * { error: { code, message } }
 * Explicitly maps DUPLICATE_BILLING, OVERPAYMENT, INVALID_TRANSITION, NOT_DUE
 */
export function formatApiError(err, fallback = 'Operation failed') {
  if (!err) return fallback;

  const contractErr = err.response?.data?.error;
  if (contractErr) {
    const { code, message } = contractErr;
    switch (code) {
      case 'DUPLICATE_BILLING':
        return message || 'Duplicate billing detected: An invoice for this subscription period already exists.';
      case 'OVERPAYMENT':
        return message || 'Overpayment rejected: Recorded amount exceeds the invoice outstanding balance.';
      case 'INVALID_TRANSITION':
        return message || 'Invalid status transition: This lifecycle action is not allowed in the current state.';
      case 'NOT_DUE':
        return message || 'Subscription not due: The scheduled next billing date has not arrived yet.';
      case 'NOT_FOUND':
        return message || 'The requested record could not be found.';
      case 'FORBIDDEN':
        return message || 'Access denied: You do not have permission for this resource.';
      case 'VALIDATION_ERROR':
        return message || 'Validation error: Please review the inputs provided.';
      default:
        return message || `${fallback} (${code})`;
    }
  }

  // Check standard FastAPI detail
  const detail = err.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg || JSON.stringify(d)).join('; ');
  }

  return err.message || fallback;
}

async function request(apiCall, mockCall) {
  if (USE_MOCKS) {
    return await mockCall();
  }
  try {
    return await apiCall();
  } catch (err) {
    // If backend is unreachable (offline or network error) and mock is available
    const isNetworkError = !err.response || err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED';
    if (isNetworkError && mockCall) {
      console.warn('Backend server offline or unreachable. Falling back to local mock state.');
      return await mockCall();
    }
    throw err;
  }
}

// ==========================================
// 7. TAXES
// ==========================================
export async function getTaxes(params = {}) {
  return request(
    () => api.get('/taxes', { params }),
    () => mockBilling.mockGetTaxes(params)
  );
}

export async function createTax(data) {
  return request(
    () => api.post('/taxes', data),
    () => mockBilling.mockCreateTax(data)
  );
}

export async function updateTax(id, data) {
  return request(
    () => api.put(`/taxes/${id}`, data),
    () => mockBilling.mockUpdateTax(id, data)
  );
}

export async function deleteTax(id) {
  return request(
    () => api.delete(`/taxes/${id}`),
    () => mockBilling.mockDeleteTax(id)
  );
}

// ==========================================
// 8. DISCOUNTS
// ==========================================
export async function getDiscounts(params = {}) {
  return request(
    () => api.get('/discounts', { params }),
    () => mockBilling.mockGetDiscounts(params)
  );
}

export async function createDiscount(data) {
  return request(
    () => api.post('/discounts', data),
    () => mockBilling.mockCreateDiscount(data)
  );
}

export async function updateDiscount(id, data) {
  return request(
    () => api.put(`/discounts/${id}`, data),
    () => mockBilling.mockUpdateDiscount(id, data)
  );
}

export async function deleteDiscount(id) {
  return request(
    () => api.delete(`/discounts/${id}`),
    () => mockBilling.mockDeleteDiscount(id)
  );
}

// ==========================================
// 9. QUOTATION TEMPLATES
// ==========================================
export async function getQuotationTemplates(params = {}) {
  return request(
    () => api.get('/quotation-templates', { params }),
    () => mockBilling.mockGetQuotationTemplates(params)
  );
}

export async function getQuotationTemplate(id) {
  return request(
    () => api.get(`/quotation-templates/${id}`),
    () => mockBilling.mockGetQuotationTemplate(id)
  );
}

export async function createQuotationTemplate(data) {
  return request(
    () => api.post('/quotation-templates', data),
    () => mockBilling.mockCreateQuotationTemplate(data)
  );
}

export async function updateQuotationTemplate(id, data) {
  return request(
    () => api.put(`/quotation-templates/${id}`, data),
    () => mockBilling.mockUpdateQuotationTemplate(id, data)
  );
}

export async function deleteQuotationTemplate(id) {
  return request(
    () => api.delete(`/quotation-templates/${id}`),
    () => mockBilling.mockDeleteQuotationTemplate(id)
  );
}

// ==========================================
// 10. SUBSCRIPTIONS
// ==========================================
export async function getSubscriptions(params = {}) {
  return request(
    () => api.get('/subscriptions', { params }),
    () => mockBilling.mockGetSubscriptions(params)
  );
}

export async function getSubscription(id) {
  return request(
    () => api.get(`/subscriptions/${id}`),
    () => mockBilling.mockGetSubscription(id)
  );
}

export async function createSubscription(data) {
  return request(
    () => api.post('/subscriptions', data),
    () => mockBilling.mockCreateSubscription(data)
  );
}

export async function updateSubscription(id, data) {
  return request(
    () => api.put(`/subscriptions/${id}`, data),
    () => mockBilling.mockSubscriptionAction(id, 'update', data)
  );
}

export async function sendQuotation(id) {
  return request(
    () => api.post(`/subscriptions/${id}/send-quotation`),
    () => mockBilling.mockSubscriptionAction(id, 'send-quotation')
  );
}

export async function confirmSubscription(id) {
  return request(
    () => api.post(`/subscriptions/${id}/confirm`),
    () => mockBilling.mockSubscriptionAction(id, 'confirm')
  );
}

export async function activateSubscription(id, data = {}) {
  return request(
    () => api.post(`/subscriptions/${id}/activate`, data),
    () => mockBilling.mockSubscriptionAction(id, 'activate', data)
  );
}

export async function pauseSubscription(id) {
  return request(
    () => api.post(`/subscriptions/${id}/pause`),
    () => mockBilling.mockSubscriptionAction(id, 'pause')
  );
}

export async function resumeSubscription(id) {
  return request(
    () => api.post(`/subscriptions/${id}/resume`),
    () => mockBilling.mockSubscriptionAction(id, 'resume')
  );
}

export async function closeSubscription(id) {
  return request(
    () => api.post(`/subscriptions/${id}/close`),
    () => mockBilling.mockSubscriptionAction(id, 'close')
  );
}

export async function renewSubscription(id) {
  return request(
    () => api.post(`/subscriptions/${id}/renew`),
    () => mockBilling.mockSubscriptionAction(id, 'renew')
  );
}

// ==========================================
// 11. INVOICES
// ==========================================
export async function getInvoices(params = {}) {
  return request(
    () => api.get('/invoices', { params }),
    () => mockBilling.mockGetInvoices(params)
  );
}

export async function getInvoice(id) {
  return request(
    () => api.get(`/invoices/${id}`),
    () => mockBilling.mockGetInvoice(id)
  );
}

export async function generateInvoice(subscriptionId) {
  return request(
    () => api.post('/invoices/generate', { subscription_id: subscriptionId }),
    () => mockBilling.mockGenerateInvoice(subscriptionId)
  );
}

export async function runBilling(asOfDate) {
  const body = asOfDate ? { as_of_date: asOfDate } : {};
  return request(
    () => api.post('/invoices/run-billing', body),
    () => mockBilling.mockRunBilling(asOfDate)
  );
}

export async function confirmInvoice(id) {
  return request(
    () => api.post(`/invoices/${id}/confirm`),
    () => mockBilling.mockConfirmInvoice(id)
  );
}

export async function cancelInvoice(id) {
  return request(
    () => api.post(`/invoices/${id}/cancel`),
    () => mockBilling.mockCancelInvoice(id)
  );
}

// ==========================================
// 12. PAYMENTS
// ==========================================
export async function createPayment(invoiceId, data) {
  return request(
    () => api.post(`/invoices/${invoiceId}/payments`, data),
    () => mockBilling.mockRecordPayment(invoiceId, data)
  );
}

export async function getPayments(params = {}) {
  return request(
    () => api.get('/payments', { params }),
    () => mockBilling.mockGetPayments(params)
  );
}

export async function getPayment(id) {
  return request(
    () => api.get(`/payments/${id}`),
    () => mockBilling.mockGetPayment(id)
  );
}

// ==========================================
// CATALOG & ENTITY LOOKUPS (P1 / P3)
// ==========================================
export async function getCustomers(params = { page_size: 100 }) {
  return api.get('/customers', { params });
}

export async function getPlans(params = { page_size: 100 }) {
  return api.get('/plans', { params });
}

export async function getProducts(params = { page_size: 100 }) {
  return api.get('/products', { params });
}
