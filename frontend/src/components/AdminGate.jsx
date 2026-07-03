import { useState } from 'react';
import { verifyAdminKey } from '../api/client';
import { getAdminKey, setAdminKey } from '../utils/adminSession';
import '../pages/pages.css';

export default function AdminGate({ children }) {
  const [authenticated, setAuthenticated] = useState(() => Boolean(getAdminKey()));
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter the admin password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await verifyAdminKey(password.trim());
      setAdminKey(password.trim());
      setAuthenticated(true);
      setPassword('');
    } catch (err) {
      setError(err.message === 'Invalid or missing admin key' ? 'Invalid password' : err.message);
    } finally {
      setLoading(false);
    }
  }

  if (authenticated) {
    return children;
  }

  return (
    <div className="admin-login-page">
      <div className="card admin-login-card">
        <h1 className="page-title">Admin Access</h1>
        <p className="page-subtitle">Enter your password to open the operations dashboard.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="adminPassword">Password</label>
            <input
              id="adminPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              autoComplete="current-password"
              autoFocus
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Verifying...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
