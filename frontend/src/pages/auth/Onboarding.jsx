import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Command, LoaderCircle } from "lucide-react";
import api from "../../lib/api";
import { getStoredUser, setSession } from "../../lib/auth";

export default function Onboarding() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user?.businessId) {
    return <Navigate to="/" replace />;
  }

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/businesses", {
        name: name.trim(),
        phone: phone.trim(),
        serviceType: serviceType.trim(),
      });

      const nextUser = response.data.user || {
        ...user,
        businessId: response.data.business?._id,
      };

      setSession(response.data.token, nextUser);
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not create your business. Please try again."
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

        <p className="staff-login-eyebrow">WORKSPACE SETUP</p>
        <h1>Tell us about your business</h1>
        <p className="staff-login-subtitle">
          This creates your ServiceFlow workspace for customers, jobs, and team.
        </p>

        <form onSubmit={handleCreate} className="staff-login-form">
          <label htmlFor="businessName">Business name</label>
          <input
            id="businessName"
            type="text"
            placeholder="e.g. CoolAir Services"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

          <label htmlFor="serviceType">Primary service type</label>
          <input
            id="serviceType"
            type="text"
            placeholder="e.g. AC repair & appliance service"
            value={serviceType}
            onChange={(event) => setServiceType(event.target.value)}
            required
          />

          <label htmlFor="phone">Business phone</label>
          <input
            id="phone"
            type="tel"
            placeholder="Optional contact number"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />

          {error && <p className="staff-login-error">{error}</p>}

          <button type="submit" className="staff-login-submit" disabled={loading}>
            {loading ? (
              <>
                <LoaderCircle size={18} className="staff-login-spinner" />
                Creating workspace...
              </>
            ) : (
              "Create workspace"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
