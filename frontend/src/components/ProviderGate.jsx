import { useState } from 'react';
import { providerLogin } from '../api/client';
import { getProviderToken, setProviderSession } from '../utils/providerSession';
import '../pages/pages.css';

export default function ProviderGate({ children }) {
  const [authenticated, setAuthenticated] = useState(() => Boolean(getProviderToken()));
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!/^\d{10}$/.test(phone)) {
      setError('Enter a valid 10-digit phone number');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await providerLogin(phone, password);
      setProviderSession(res.data.token, res.data.provider);
      setAuthenticated(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (authenticated) return children;

  return (
    <div className="admin-login-page">
      <div className="card admin-login-card">
        <h1 className="page-title">Provider Login</h1>
        <p className="page-subtitle">Sign in with your phone and password.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="providerPhone">Phone</label>
            <input
              id="providerPhone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="1234567890"
              maxLength={10}
            />
          </div>
          <div className="form-group">
            <label htmlFor="providerPassword">Password</label>
            <input
              id="providerPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
