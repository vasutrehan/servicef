import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Command, Eye, EyeOff, LoaderCircle } from "lucide-react";
import api from "../../lib/api";
import { setSession } from "../../lib/auth";

export default function OwnerRegister() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/auth/register", {
        name: name.trim(),
        email: email.trim(),
        password,
      });

      const loginResponse = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });

      const { token, user } = loginResponse.data;
      setSession(token, user);
      navigate("/onboarding", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed. Please try again."
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

        <p className="staff-login-eyebrow">GET STARTED</p>
        <h1>Create your owner account</h1>
        <p className="staff-login-subtitle">
          Set up ServiceFlow for your service business in a few minutes.
        </p>

        <form onSubmit={handleRegister} className="staff-login-form">
          <label htmlFor="name">Full name</label>
          <input
            id="name"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            autoComplete="name"
          />

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
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
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
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <p className="auth-footer-links">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
