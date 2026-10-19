import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Wrench, Eye, EyeOff, LoaderCircle } from "lucide-react";
import api from "../../lib/api";
import { setSession } from "../../lib/auth";

export default function StaffLogin() {
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        staffId: staffId.trim(),
        password,
      });

      const { token, user } = response.data;

      if (user.role !== "staff") {
        setError("This login is only for staff accounts.");
        return;
      }

      setSession(token, user);

      navigate("/staff/tasks", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message || "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="staff-login-page">
      <div className="staff-login-card">
        <div className="staff-login-brand">
          <div className="staff-brand-icon">
            <Wrench size={22} />
          </div>
          <span>
            serviceflow<span className="staff-brand-dot">.</span>
          </span>
        </div>

        <p className="staff-login-eyebrow">STAFF PORTAL</p>
        <h1>Welcome back</h1>
        <p className="staff-login-subtitle">
          Sign in to view and manage your assigned jobs.
        </p>

        <form onSubmit={handleLogin} className="staff-login-form">
          <label htmlFor="staffId">Staff ID</label>
          <input
            id="staffId"
            type="text"
            placeholder="Enter your staff ID"
            value={staffId}
            onChange={(e) => setStaffId(e.target.value.toUpperCase())}
            required
            autoComplete="username"
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
              onChange={(e) => setPassword(e.target.value)}
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

          <button
            type="submit"
            className="staff-login-submit"
            disabled={loading}
          >
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

        <p className="staff-login-footer">
          Use the Staff ID and password provided by your business owner.
        </p>

        <p className="staff-login-switch">
          Business owner? <Link to="/login">Go to business login</Link>
        </p>
      </div>
    </div>
  );
}
