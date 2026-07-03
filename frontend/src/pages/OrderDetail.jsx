import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getOrderDetail } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import ProductImage from '../components/ProductImage';
import './pages.css';

export default function OrderDetail() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const phone = searchParams.get('phone') || '';

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!phone) {
      setError('Phone number is required. Go to My Orders and search first.');
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const res = await getOrderDetail(orderId, phone);
        setOrder(res.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [orderId, phone]);

  if (loading) {
    return <p className="page-subtitle">Loading order details...</p>;
  }

  if (error) {
    return (
      <div>
        <div className="alert alert-error">{error}</div>
        <Link to="/orders" className="btn btn-secondary">Back to My Orders</Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/orders" style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
        ← Back to My Orders
      </Link>

      <div className="order-detail-header">
        <ProductImage name={order.productName} className="order-detail-img" />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ margin: 0 }}>{order.productName}</h1>
            <StatusBadge status={order.orderStatus} />
          </div>
          <p className="page-subtitle" style={{ margin: '0.5rem 0 0' }}>{order.orderId}</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Customer</div>
            <div style={{ fontWeight: 600 }}>{order.customerName}</div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Phone</div>
            <div style={{ fontWeight: 600 }}>{order.phone}</div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Amount</div>
            <div style={{ fontWeight: 600 }}>₹{order.amount.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Payment</div>
            <div style={{ fontWeight: 600 }}>
              {order.paymentStatus === 'COD' ? 'Cash on Delivery' : order.paymentStatus}
            </div>
          </div>
        </div>
      </div>

      {order.otp && (
        <div className="otp-box">
          <div className="otp-label">Delivery OTP — share with delivery partner</div>
          <div className="otp-code">{order.otp}</div>
          {order.otpExpiresAt && (
            <div className="otp-expiry">
              Expires {new Date(order.otpExpiresAt).toLocaleString()}
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem' }}>Order Timeline</h2>
        <ul className="timeline">
          {order.statusHistory?.map((entry, i) => (
            <li key={i}>
              <div className="timeline-status">{entry.status.replace(/_/g, ' ')}</div>
              <div className="timeline-meta">
                {new Date(entry.changedAt).toLocaleString()} · {entry.changedBy}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
