import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Command, Eye, EyeOff, LoaderCircle } from "lucide-react";
import api from "../../lib/api";
import { setSession } from "../../lib/auth";

export default function OwnerLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });

      const { token, user } = response.data;

      if (user.role !== "owner") {
        setError("This login is only for business owners.");
        return;
      }

      setSession(token, user);

      if (!user.businessId) {
        navigate("/onboarding", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark">
            <Command size={22} strokeWidth={2.5} />
          </div>
          <div>
            <div className="brand-name">
              serviceflow<span>.</span>
            </div>
            <div className="brand-caption">BUSINESS OS</div>
          </div>
        </div>

        <p className="staff-login-eyebrow">OWNER ACCESS</p>
        <h1>Sign in to your workspace</h1>
        <p className="staff-login-subtitle">
          Manage customers, jobs, team, and payments from one place.
        </p>

        <form onSubmit={handleLogin} className="staff-login-form">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="you@business.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />

          <div className="staff-password-label">
            <label htmlFor="password">Password</label>
          </div>

          <div className="staff-password-input">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((previous) => !previous)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>

          {error && <p className="staff-login-error">{error}</p>}

          <button type="submit" className="staff-login-submit" disabled={loading}>
            {loading ? (
              <>
                <LoaderCircle size={18} className="staff-login-spinner" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <p className="auth-footer-links">
          New to ServiceFlow? <Link to="/register">Create an account</Link>
          <br />
          Staff member? <Link to="/staff/login">Open staff portal</Link>
        </p>
      </div>
    </div>
  );
}
