import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore.js";
import { apiClient } from "../lib/apiClient.js";
import "./Navbar.css";

export function Navbar() {
  const { accessToken, user, clearAuth } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const isLoggedIn = Boolean(accessToken);

  async function handleLogout() {
    try {
      await apiClient.post("/api/auth/logout");
    } catch {
      // ignore errors — clear local state regardless
    } finally {
      clearAuth();
      navigate("/login", { replace: true });
    }
  }

  return (
    <nav className="navbar glass" role="navigation" aria-label="Main navigation">
      <div className="navbar-inner container">
        {/* Brand */}
        <Link to="/gallery" className="navbar-brand" aria-label="Meb Gallery home">
          <span className="navbar-logo" aria-hidden="true">✦</span>
          <span className="navbar-title">
            Meb <span className="gold-text">Gallery</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="navbar-links">
          {isLoggedIn ? (
            <>
              <Link
                to="/gallery"
                className={`navbar-link ${location.pathname === "/gallery" ? "active" : ""}`}
              >
                Gallery
              </Link>
              {user && (
                <span className="navbar-user badge badge-gold">{user.name}</span>
              )}
              <button
                id="logout-btn"
                className="btn btn-ghost navbar-link"
                onClick={handleLogout}
                type="button"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
