import { useCallback, useEffect, useState } from 'react';
import {
  providerListMyOrders,
  providerSendOtp,
  providerVerifyOtp,
} from '../api/client';
import { clearProviderSession, getProviderInfo } from '../utils/providerSession';
import StatusBadge from '../components/StatusBadge';
import './pages.css';

export default function ProviderDashboard() {
  const provider = getProviderInfo();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [otpInputs, setOtpInputs] = useState({});

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await providerListMyOrders();
      setOrders(res.data.orders);
    } catch (err) {
      setError(err.message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  async function handleSendOtp(orderId) {
    setActionLoading(orderId);
    setError('');
    try {
      const res = await providerSendOtp(orderId);
      alert(res.message || 'OTP sent to customer. Ask them for the code at delivery.');
      await fetchOrders();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading('');
    }
  }

  async function handleVerify(orderId) {
    const otp = otpInputs[orderId]?.trim();
    if (!otp) {
      setError('Enter the OTP from customer');
      return;
    }

    setActionLoading(`${orderId}-verify`);
    setError('');
    try {
      const res = await providerVerifyOtp(orderId, otp);
      alert(res.message);
      setOtpInputs((prev) => ({ ...prev, [orderId]: '' }));
      await fetchOrders();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading('');
    }
  }

  function handleLogout() {
    clearProviderSession();
    window.location.reload();
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1 className="page-title">My Deliveries</h1>
          <p className="page-subtitle">
            Welcome, {provider?.name || 'Provider'} · Assigned orders only
          </p>
        </div>
        <div className="admin-header-actions">
          <button type="button" className="btn btn-secondary" onClick={fetchOrders}>
            Refresh
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && <div className="empty-state card">Loading orders...</div>}

      {!loading && orders.length === 0 && (
        <div className="empty-state card">
          No orders assigned yet. Admin will assign READY_TO_SHIP orders to you.
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="order-list">
          {orders.map((order) => (
            <div key={order.orderId} className="card provider-order-card">
              <div className="provider-order-header">
                <div>
                  <h3>{order.productName}</h3>
                  <p className="provider-order-meta">
                    {order.orderId} · {order.customerName} · {order.phone}
                  </p>
                </div>
                <StatusBadge status={order.orderStatus} />
              </div>

              <p><strong>Amount:</strong> ₹{order.amount.toLocaleString()}</p>

              <div className="provider-order-actions">
                {order.orderStatus === 'READY_TO_SHIP' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={actionLoading === order.orderId}
                    onClick={() => handleSendOtp(order.orderId)}
                  >
                    {actionLoading === order.orderId ? 'Generating...' : 'Generate OTP & Start Delivery'}
                  </button>
                )}

                {order.orderStatus === 'OUT_FOR_DELIVERY' && (
                  <>
                    <input
                      className="provider-otp-input"
                      placeholder="Enter customer OTP"
                      maxLength={6}
                      value={otpInputs[order.orderId] || ''}
                      onChange={(e) =>
                        setOtpInputs((prev) => ({
                          ...prev,
                          [order.orderId]: e.target.value.replace(/\D/g, ''),
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={actionLoading === `${order.orderId}-verify`}
                      onClick={() => handleVerify(order.orderId)}
                    >
                      {actionLoading === `${order.orderId}-verify` ? 'Verifying...' : 'Complete Delivery'}
                    </button>
                  </>
                )}

                {order.orderStatus === 'COMPLETED' && (
                  <span className="provider-done">Delivery completed</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
