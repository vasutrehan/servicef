import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  LoaderCircle,
  LogOut,
  Mail,
  RefreshCw,
  Shield,
  UserRound,
} from "lucide-react";
import api from "../../lib/api";
import {
  clearSession,
  getInitials,
  getStoredUser,
  setSession,
} from "../../lib/auth";

export default function StaffProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser());
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const [meRes, businessRes] = await Promise.all([
        api.get("/auth/me"),
        api.get("/businesses/my-business").catch(() => null),
      ]);

      const nextUser = meRes.data.user;
      setUser(nextUser);
      setSession(localStorage.getItem("token"), nextUser);
      setBusinessName(businessRes?.data?.business?.name || "");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load your profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleLogout = () => {
    clearSession();
    navigate("/staff/login", { replace: true });
  };

  return (
    <div className="my-tasks-page">
      <div className="tasks-heading">
        <div>
          <p className="staff-eyebrow">YOUR ACCOUNT</p>
          <h1>My Profile</h1>
          <p className="staff-subtitle">
            Account details for your staff portal access.
          </p>
        </div>
        <div className="tasks-heading-icon">
          <UserRound size={23} />
        </div>
      </div>

      {loading ? (
        <div className="staff-profile-state">
          <LoaderCircle size={28} className="staff-login-spinner" />
          <p>Loading profile…</p>
        </div>
      ) : error ? (
        <div className="staff-profile-state">
          <p>{error}</p>
          <button
            type="button"
            className="staff-profile-secondary"
            onClick={loadProfile}
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      ) : (
        <article className="staff-profile-card">
          <div className="staff-profile-hero">
            <div className="staff-profile-avatar">
              {getInitials(user?.name)}
            </div>
            <div className="staff-profile-identity">
              <strong>{user?.name || "Staff member"}</strong>
              <span>{businessName || "Your business workspace"}</span>
            </div>
            <span
              className={`staff-profile-status ${
                user?.isActive === false ? "is-inactive" : "is-active"
              }`}
            >
              {user?.isActive === false ? "Inactive" : "Active"}
            </span>
          </div>

          <div className="staff-profile-meta">
            <div>
              <span>
                <Shield size={14} /> Staff ID
              </span>
              <strong>{user?.staffId || "—"}</strong>
            </div>
            <div>
              <span>
                <Mail size={14} /> Email
              </span>
              <strong>{user?.email || "—"}</strong>
            </div>
            <div>
              <span>
                <UserRound size={14} /> Role
              </span>
              <strong>Staff technician</strong>
            </div>
            <div>
              <span>
                <Briefcase size={14} /> Business
              </span>
              <strong>{businessName || "Not linked"}</strong>
            </div>
          </div>

          <button
            type="button"
            className="staff-profile-logout"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            Sign out
          </button>
        </article>
      )}
    </div>
  );
}
