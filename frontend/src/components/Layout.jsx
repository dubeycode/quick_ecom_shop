import { Link, useLocation } from 'react-router-dom';
import './Layout.css';

export default function Layout({ children }) {
  const { pathname } = useLocation();

  const links = [
    { to: '/', label: 'Shop' },
    { to: '/orders', label: 'My Orders' },
  ];

  return (
    <div className="layout">
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="logo">
            Order<span>Flow</span>
          </Link>
          <nav>
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={pathname === link.to ? 'nav-link active' : 'nav-link'}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
