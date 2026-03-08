import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Layout() {
  const { user, logout: doLogout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await doLogout();
    setMenuOpen(false);
  };

  return (
    <div className="site">
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="logo" onClick={() => setMenuOpen(false)}>
            Charmr
          </Link>

          <button
            className={`menu-toggle ${menuOpen ? "open" : ""}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
          >
            <span />
            <span />
            <span />
          </button>

          <nav className={`nav ${menuOpen ? "nav--open" : ""}`}>
            <NavLink to="/" end onClick={() => setMenuOpen(false)}>
              Home
            </NavLink>
            <NavLink to="/about" onClick={() => setMenuOpen(false)}>
              About
            </NavLink>
            <NavLink to="/events" onClick={() => setMenuOpen(false)}>
              Events
            </NavLink>
            <NavLink to="/contact" onClick={() => setMenuOpen(false)}>
              Contact
            </NavLink>
          </nav>

          <div className={`header-auth ${menuOpen ? "header-auth--open" : ""}`}>
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="btn btn--ghost"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/profile"
                  className="btn btn--ghost"
                  onClick={() => setMenuOpen(false)}
                >
                  Profile
                </Link>
                <button onClick={handleLogout} className="btn btn--outline">
                  Log out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="btn btn--primary"
                onClick={() => setMenuOpen(false)}
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <p>
            Charmr is free for charities. Licensed under the{" "}
            <a
              href="https://github.com/my0373/charmr/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
            >
              Charity First Licence
            </a>
            .
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
