import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore.js";
import { apiClient } from "../lib/apiClient.js";
import type { AuthResponse } from "@meb-gallery/shared";
import "./AuthPages.css";

export function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    try {
      const { data } = await apiClient.post<AuthResponse>("/api/auth/register", {
        name,
        email,
        password,
      });
      setAuth(data.accessToken, data.user);
      navigate("/gallery", { replace: true });
    } catch (err: unknown) {
      const errData = (
        err as { response?: { data?: { error?: { message?: string; details?: Record<string, string[]> } } } }
      )?.response?.data?.error;
      if (errData?.details) {
        setFieldErrors(errData.details);
      } else {
        setError(errData?.message ?? "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page auth-page">
      <div className="auth-container">
        <div className="auth-card card scale-in">
          {/* Header */}
          <div className="auth-header">
            <div className="auth-logo">✦</div>
            <h1 className="auth-title">
              Create your <span className="gold-text">gallery</span>
            </h1>
            <p className="auth-subtitle">Join thousands of creators</p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="auth-error" role="alert" id="register-error">
              {error}
            </div>
          )}

          {/* Form */}
          <form className="auth-form" id="register-form" aria-label="Registration form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="register-name" className="form-label">Full name</label>
              <input
                id="register-name"
                type="text"
                className={`input ${fieldErrors["name"] ? "error" : ""}`}
                placeholder="Jane Doe"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {fieldErrors["name"] && (
                <span className="form-error">{fieldErrors["name"][0]}</span>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="register-email" className="form-label">Email</label>
              <input
                id="register-email"
                type="email"
                className={`input ${fieldErrors["email"] ? "error" : ""}`}
                placeholder="you@example.com"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {fieldErrors["email"] && (
                <span className="form-error">{fieldErrors["email"][0]}</span>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="register-password" className="form-label">Password</label>
              <input
                id="register-password"
                type="password"
                className={`input ${fieldErrors["password"] ? "error" : ""}`}
                placeholder="At least 10 characters"
                autoComplete="new-password"
                minLength={10}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {fieldErrors["password"] && (
                <span className="form-error">{fieldErrors["password"][0]}</span>
              )}
            </div>
            <button
              id="register-submit-btn"
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : "Create account"}
            </button>
          </form>

          {/* Divider */}
          <div className="auth-divider">
            <span className="divider" />
            <span className="auth-divider-text">or</span>
            <span className="divider" />
          </div>

          {/* OAuth */}
          <button id="google-register-btn" className="btn btn-ghost auth-oauth" type="button">
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Footer */}
          <p className="auth-footer">
            Already have an account?{" "}
            <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
