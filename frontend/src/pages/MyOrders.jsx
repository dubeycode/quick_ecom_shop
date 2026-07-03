import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listOrders } from '../api/client';
import { getSavedPhone, savePhone } from '../utils/phone';
import StatusBadge from '../components/StatusBadge';
import ProductImage from '../components/ProductImage';
import './pages.css';

export default function MyOrders() {
  const [phone, setPhone] = useState(getSavedPhone());
  const [searchPhone, setSearchPhone] = useState(getSavedPhone());
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  async function fetchOrders(phoneNumber) {
    if (!phoneNumber) {
      setError('Please enter your phone number');
      return;
    }

    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const res = await listOrders(phoneNumber);
      setOrders(res.data.orders);
      setPhone(phoneNumber);
      savePhone(phoneNumber);
    } catch (err) {
      setError(err.message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (getSavedPhone()) {
      fetchOrders(getSavedPhone());
    }
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    fetchOrders(searchPhone);
  }

  return (
    <div>
      <h1 className="page-title">My Orders</h1>
      <p className="page-subtitle">Enter your phone number to view all orders.</p>

      <form onSubmit={handleSearch} className="card" style={{ marginBottom: '1.5rem', maxWidth: 420 }}>
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label htmlFor="searchPhone">Phone Number</label>
          <input
            id="searchPhone"
            value={searchPhone}
            onChange={(e) => setSearchPhone(e.target.value)}
            placeholder="7643869052"
            maxLength={10}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Loading...' : 'Search Orders'}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {!loading && searched && orders.length === 0 && !error && (
        <div className="empty-state card">No orders found for this phone number.</div>
      )}

      {orders.length > 0 && (
        <div className="order-list">
          {orders.map((order) => (
            <Link
              key={order.orderId}
              to={`/orders/${order.orderId}?phone=${phone}`}
              className="order-card"
            >
              <ProductImage name={order.productName} className="order-card-thumb" />
              <div className="order-card-body">
                <h3>{order.productName}</h3>
                <p>{order.orderId} · {new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="order-card-meta">
                <StatusBadge status={order.orderStatus} />
                <span className="order-amount">₹{order.amount.toLocaleString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
