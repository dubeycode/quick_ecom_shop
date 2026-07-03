import { getAdminKey } from '../utils/adminSession';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = data.message || 'Request failed';
    const error = new Error(message);
    error.status = res.status;
    error.errors = data.errors;
    throw error;
  }

  return data;
}

function adminHeaders() {
  return { 'x-admin-key': getAdminKey() };
}

export async function verifyAdminKey(key) {
  const res = await fetch(`${API_URL}/admin/stats`, {
    headers: { 'x-admin-key': key },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Invalid password');
  }
  return data;
}

export function createOrder(body) {
  return request('/user/orders', { method: 'POST', body: JSON.stringify(body) });
}

export function listOrders(phone, page = 1, limit = 10) {
  const params = new URLSearchParams({ phone, page: String(page), limit: String(limit) });
  return request(`/user/orders?${params}`);
}

export function getOrderDetail(orderId, phone) {
  const params = new URLSearchParams({ phone });
  return request(`/user/orders/${orderId}?${params}`);
}

export function adminListOrders(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '' && value != null) params.set(key, String(value));
  });
  const qs = params.toString();
  return request(`/admin/orders${qs ? `?${qs}` : ''}`, { headers: adminHeaders() });
}

export function adminGetOrder(orderId) {
  return request(`/admin/orders/${orderId}`, { headers: adminHeaders() });
}

export function adminGetStats() {
  return request('/admin/stats', { headers: adminHeaders() });
}

export function adminTriggerScheduler() {
  return request('/admin/scheduler/run', {
    method: 'POST',
    headers: adminHeaders(),
  });
}

export function adminGetSchedulerLogs(page = 1, limit = 20) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  return request(`/admin/scheduler-logs?${params}`, { headers: adminHeaders() });
}

export function adminGetOrderHistory(orderId) {
  return request(`/admin/orders/${orderId}/history`, { headers: adminHeaders() });
}

export function adminUpdateOrderStatus(orderId, body) {
  return request(`/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: adminHeaders(),
    body: JSON.stringify(body),
  });
}
