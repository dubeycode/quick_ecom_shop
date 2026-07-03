import { useCallback, useEffect, useState } from 'react';
import { clearAdminKey } from '../utils/adminSession';
import {
  adminGetOrder,
  adminGetSchedulerLogs,
  adminGetStats,
  adminListOrders,
  adminTriggerScheduler,
  adminUpdateOrderStatus,
} from '../api/client';
import StatusBadge from '../components/StatusBadge';
import './pages.css';

const ORDER_STATUSES = [
  '',
  'PLACED',
  'PROCESSING',
  'READY_TO_SHIP',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
  'CANCELLED',
];

const PAYMENT_STATUSES = ['', 'COD', 'PAID'];

function formatDate(value) {
  return new Date(value).toLocaleString();
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('orders');
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [logsPagination, setLogsPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ status: '', paymentStatus: '', search: '', page: 1, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [schedulerRunning, setSchedulerRunning] = useState(false);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    const res = await adminGetStats();
    setStats(res.data);
  }, []);

  const fetchOrders = useCallback(async (currentFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      const res = await adminListOrders(currentFilters);
      setOrders(res.data.orders);
      setPagination(res.data.pagination);
      await fetchStats();
    } catch (err) {
      setError(err.message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [filters, fetchStats]);

  const fetchLogs = useCallback(async (page = 1) => {
    setLogsLoading(true);
    setError('');
    try {
      const res = await adminGetSchedulerLogs(page, 20);
      setLogs(res.data.logs);
      setLogsPagination(res.data.pagination);
    } catch (err) {
      setError(err.message);
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, []);

  function handleFilterChange(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  function handleSearch(e) {
    e.preventDefault();
    fetchOrders(filters);
  }

  function handleRefresh() {
    if (tab === 'orders') fetchOrders();
    else fetchLogs(logsPagination.page);
  }

  function handlePageChange(newPage) {
    const next = { ...filters, page: newPage };
    setFilters(next);
    fetchOrders(next);
  }

  async function openOrderDetail(orderId) {
    setDetailLoading(true);
    setSelectedOrder(null);
    try {
      const res = await adminGetOrder(orderId);
      setSelectedOrder(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleCancelOrder(e, orderId) {
    e.stopPropagation();
    if (!window.confirm('Cancel this order?')) return;
    try {
      await adminUpdateOrderStatus(orderId, {
        orderStatus: 'CANCELLED',
        note: 'Cancelled by admin',
      });
      setSelectedOrder(null);
      setError('');
      fetchOrders();
    } catch (err) {
      const detail = err.errors?.[0]?.message;
      setError(detail ? `${err.message}: ${detail}` : err.message);
    }
  }

  async function handleRunScheduler() {
    setSchedulerRunning(true);
    setError('');
    try {
      const res = await adminTriggerScheduler();
      await fetchLogs();
      await fetchOrders();
      setError('');
      alert(res.message || 'Scheduler completed');
    } catch (err) {
      setError(err.message);
    } finally {
      setSchedulerRunning(false);
    }
  }

  function handleLogout() {
    clearAdminKey();
    window.location.reload();
  }

  function switchTab(nextTab) {
    setTab(nextTab);
    setError('');
    if (nextTab === 'logs' && logs.length === 0) fetchLogs();
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1 className="page-title">Operations Dashboard</h1>
          <p className="page-subtitle">Monitor orders, analytics, and scheduler activity.</p>
        </div>
        <div className="admin-header-actions">
          <button type="button" className="btn btn-secondary" onClick={handleRefresh}>
            Refresh
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {stats && (
        <div className="stats-grid">
          <StatCard label="Total Orders" value={stats.totalOrders} />
          <StatCard label="Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`} />
          <StatCard label="Today" value={stats.todayOrders} />
          <StatCard label="Completed" value={stats.byOrderStatus.COMPLETED ?? 0} />
        </div>
      )}

      <div className="admin-tabs">
        <button
          type="button"
          className={tab === 'orders' ? 'admin-tab active' : 'admin-tab'}
          onClick={() => switchTab('orders')}
        >
          Orders
        </button>
        <button
          type="button"
          className={tab === 'logs' ? 'admin-tab active' : 'admin-tab'}
          onClick={() => switchTab('logs')}
        >
          Scheduler Logs
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {tab === 'orders' && (
        <>
          <form onSubmit={handleSearch} className="card admin-filters">
            <div className="admin-filters-row">
              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">All statuses</option>
                  {ORDER_STATUSES.filter(Boolean).map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="paymentStatus">Payment</label>
                <select
                  id="paymentStatus"
                  value={filters.paymentStatus}
                  onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
                >
                  <option value="">All payments</option>
                  {PAYMENT_STATUSES.filter(Boolean).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="form-group admin-search">
                <label htmlFor="search">Search</label>
                <input
                  id="search"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Order ID or customer name"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                Apply
              </button>
            </div>
          </form>

          {loading && <div className="empty-state card">Loading orders...</div>}

          {!loading && orders.length === 0 && (
            <div className="empty-state card">No orders found matching your filters.</div>
          )}

          {!loading && orders.length > 0 && (
            <div className="card admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Product</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.orderId} onClick={() => openOrderDetail(order.orderId)}>
                      <td>{order.orderId}</td>
                      <td>{order.customerName}</td>
                      <td>{order.phone}</td>
                      <td>{order.productName}</td>
                      <td>₹{order.amount.toLocaleString()}</td>
                      <td><StatusBadge status={order.orderStatus} /></td>
                      <td>{order.paymentStatus}</td>
                      <td>{formatDate(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {pagination.totalPages > 1 && (
                <div className="pagination">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={pagination.page <= 1}
                    onClick={() => handlePageChange(pagination.page - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} orders)
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => handlePageChange(pagination.page + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'logs' && (
        <>
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRunScheduler}
              disabled={schedulerRunning}
            >
              {schedulerRunning ? 'Running...' : 'Run Scheduler Now'}
            </button>
          </div>

          {logsLoading && <div className="empty-state card">Loading scheduler logs...</div>}

          {!logsLoading && logs.length === 0 && (
            <div className="empty-state card">No scheduler runs recorded yet.</div>
          )}

          {!logsLoading && logs.length > 0 && (
            <div className="card admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Run ID</th>
                    <th>Status</th>
                    <th>Scanned</th>
                    <th>Updated</th>
                    <th>Started</th>
                    <th>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.runId}>
                      <td>{log.runId}</td>
                      <td>{log.status}</td>
                      <td>{log.ordersScanned}</td>
                      <td>{log.ordersUpdated}</td>
                      <td>{formatDate(log.startedAt)}</td>
                      <td>{log.completedAt ? formatDate(log.completedAt) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {logsPagination.totalPages > 1 && (
                <div className="pagination">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={logsPagination.page <= 1}
                    onClick={() => fetchLogs(logsPagination.page - 1)}
                  >
                    Previous
                  </button>
                  <span>Page {logsPagination.page} of {logsPagination.totalPages}</span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={logsPagination.page >= logsPagination.totalPages}
                    onClick={() => fetchLogs(logsPagination.page + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {(selectedOrder || detailLoading) && (
        <div className="modal-overlay" onClick={() => !detailLoading && setSelectedOrder(null)}>
          <div className="modal-card admin-modal" onClick={(e) => e.stopPropagation()}>
            {detailLoading && <p>Loading order detail...</p>}

            {selectedOrder && (
              <>
                <div className="modal-header">
                  <h2 className="section-title">{selectedOrder.orderId}</h2>
                  <button type="button" className="modal-close" onClick={() => setSelectedOrder(null)}>×</button>
                </div>

                <div className="admin-detail-grid">
                  <p><strong>Customer:</strong> {selectedOrder.customerName}</p>
                  <p><strong>Phone:</strong> {selectedOrder.phone}</p>
                  <p><strong>Product:</strong> {selectedOrder.productName}</p>
                  <p><strong>Amount:</strong> ₹{selectedOrder.amount.toLocaleString()}</p>
                  <p><strong>Status:</strong> <StatusBadge status={selectedOrder.orderStatus} /></p>
                  <p><strong>Payment:</strong> {selectedOrder.paymentStatus}</p>
                  {selectedOrder.providerName && (
                    <p><strong>Provider:</strong> {selectedOrder.providerName}</p>
                  )}
                </div>

                <h3 className="section-title">Status History</h3>
                <ul className="timeline">
                  {selectedOrder.statusHistory.map((entry, i) => (
                    <li key={i}>
                      <div className="timeline-status">
                        {entry.fromStatus ? `${entry.fromStatus} → ${entry.toStatus}` : entry.toStatus}
                      </div>
                      <div className="timeline-meta">
                        {entry.changedBy} · {formatDate(entry.changedAt)}
                        {entry.note && ` · ${entry.note}`}
                      </div>
                    </li>
                  ))}
                </ul>

                {selectedOrder.orderStatus !== 'CANCELLED' && selectedOrder.orderStatus !== 'COMPLETED' && (
                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={(e) => handleCancelOrder(e, selectedOrder.orderId)}
                    >
                      Cancel Order
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
