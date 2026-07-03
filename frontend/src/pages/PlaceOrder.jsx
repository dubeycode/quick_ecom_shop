import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createOrder } from '../api/client';
import { savePhone } from '../utils/phone';
import { PRODUCTS } from '../data/products';
import './pages.css';

const initialForm = {
  customerName: '',
  phone: '',
  paymentStatus: 'COD',
};

export default function PlaceOrder() {
  const [cartItem, setCartItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [submitError, setSubmitError] = useState('');

  function addToCart(product) {
    setCartItem(product);
    setShowForm(true);
    setSuccess(null);
    setSubmitError('');
    setErrors({});
  }

  function closeForm() {
    setShowForm(false);
    setSubmitError('');
    setErrors({});
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!cartItem) return;

    setLoading(true);
    setSubmitError('');

    try {
      const res = await createOrder({
        customerName: form.customerName,
        phone: form.phone,
        productName: cartItem.name,
        amount: cartItem.amount,
        paymentStatus: form.paymentStatus,
      });
      savePhone(form.phone);
      setSuccess(res.data);
      setForm(initialForm);
      setCartItem(null);
      setShowForm(false);
    } catch (err) {
      if (err.errors?.length) {
        const fieldErrors = {};
        err.errors.forEach(({ field, message }) => {
          fieldErrors[field] = message;
        });
        setErrors(fieldErrors);
      } else {
        setSubmitError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Shop</h1>
      <p className="page-subtitle">Add a product to cart and complete your order.</p>

      {success && (
        <div className="alert alert-success">
          Order <strong>{success.orderId}</strong> placed successfully!{' '}
          <Link to={`/orders/${success.orderId}?phone=${success.phone}`}>Track order</Link>
        </div>
      )}

      <section className="product-section">
        <div className="product-grid">
          {PRODUCTS.map((product) => (
            <div key={product.id} className="product-card">
              <img src={product.image} alt={product.name} className="product-card-img" />
              <div className="product-card-info">
                <span className="product-card-name">{product.name}</span>
                <span className="product-card-price">₹{product.amount.toLocaleString()}</span>
                <button
                  type="button"
                  className="btn btn-primary btn-add-cart"
                  onClick={() => addToCart(product)}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {showForm && cartItem && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="section-title">Checkout</h2>
              <button type="button" className="modal-close" onClick={closeForm} aria-label="Close">
                ×
              </button>
            </div>

            <div className="cart-summary">
              <img src={cartItem.image} alt={cartItem.name} className="cart-summary-img" />
              <div>
                <div className="cart-summary-name">{cartItem.name}</div>
                <div className="cart-summary-price">₹{cartItem.amount.toLocaleString()}</div>
              </div>
            </div>

            {submitError && <div className="alert alert-error">{submitError}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="customerName">Full Name</label>
                <input
                  id="customerName"
                  name="customerName"
                  value={form.customerName}
                  onChange={handleChange}
                  placeholder="Satyam Dubey"
                  autoFocus
                />
                {errors.customerName && <div className="field-error">{errors.customerName}</div>}
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone (10 digits)</label>
                <input
                  id="phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="7643869052"
                  maxLength={10}
                />
                {errors.phone && <div className="field-error">{errors.phone}</div>}
              </div>

              <div className="form-group">
                <label htmlFor="paymentStatus">Payment Status</label>
                <select
                  id="paymentStatus"
                  name="paymentStatus"
                  value={form.paymentStatus}
                  onChange={handleChange}
                >
                  <option value="COD">Cash on Delivery (COD)</option>
                  <option value="PAID">Paid</option>
                </select>
                {errors.paymentStatus && <div className="field-error">{errors.paymentStatus}</div>}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeForm}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Placing...' : 'Place Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
