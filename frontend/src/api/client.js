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
