import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore.js";
import { apiClient } from "../lib/apiClient.js";
import "./Navbar.css";

export function Navbar() {
  const { accessToken, user, clearAuth } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const isLoggedIn = Boolean(accessToken);
  const [menuOpen, setMenuOpen] = useState(false);

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

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

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

        {/* Desktop nav links */}
        <div className="navbar-links">
          {isLoggedIn ? (
            <>
              <Link to="/gallery" className={`navbar-link ${isActive("/gallery") ? "active" : ""}`}>
                Gallery
              </Link>
              <Link to="/albums" className={`navbar-link ${isActive("/albums") ? "active" : ""}`}>
                Albums
              </Link>
              <Link to="/ai-studio" className={`navbar-link ${isActive("/ai-studio") ? "active" : ""}`}>
                <span className="gold-text">✦ AI Studio</span>
              </Link>
              {user?.role === "ADMIN" && (
                <Link to="/admin" className={`navbar-link ${isActive("/admin") ? "active" : ""}`}>
                  Admin
                </Link>
              )}
              <Link to="/profile" className={`navbar-link navbar-avatar ${isActive("/profile") ? "active" : ""}`}>
                <span className="navbar-avatar-icon">{user?.name?.[0]?.toUpperCase() ?? "?"}</span>
              </Link>
              <button
                id="logout-btn"
                className="btn btn-ghost navbar-link"
                onClick={() => void handleLogout()}
                type="button"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">Sign in</Link>
              <Link to="/register" className="btn btn-primary">Get started</Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        {isLoggedIn && (
          <button
            className="navbar-hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        )}
      </div>

      {/* Mobile menu */}
      {isLoggedIn && menuOpen && (
        <div className="navbar-mobile-menu glass">
          <Link to="/gallery" className="navbar-mobile-link" onClick={() => setMenuOpen(false)}>Gallery</Link>
          <Link to="/albums" className="navbar-mobile-link" onClick={() => setMenuOpen(false)}>Albums</Link>
          <Link to="/ai-studio" className="navbar-mobile-link" onClick={() => setMenuOpen(false)}>✦ AI Studio</Link>
          <Link to="/profile" className="navbar-mobile-link" onClick={() => setMenuOpen(false)}>Profile</Link>
          {user?.role === "ADMIN" && (
            <Link to="/admin" className="navbar-mobile-link" onClick={() => setMenuOpen(false)}>Admin</Link>
          )}
          <button className="navbar-mobile-link" style={{ color: "var(--color-error)" }} onClick={() => void handleLogout()}>
            Log out
          </button>
        </div>
      )}
    </nav>
  );
}
