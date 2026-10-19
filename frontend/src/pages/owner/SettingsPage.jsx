import { useEffect, useState } from "react";
import { LoaderCircle, Save } from "lucide-react";
import api from "../../lib/api";
import { clearSession, getStoredUser } from "../../lib/auth";
import { useNavigate } from "react-router-dom";

export default function SettingsPage({ onBusinessUpdated }) {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [form, setForm] = useState({ name: "", phone: "", serviceType: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await api.get("/businesses/my-business");
        const business = response.data.business;
        setForm({
          name: business.name || "",
          phone: business.phone || "",
          serviceType: business.serviceType || "",
        });
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load business profile.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await api.put("/businesses/my-business", form);
      setMessage("Workspace settings saved.");
      if (typeof onBusinessUpdated === "function") {
        onBusinessUpdated(response.data.business?.name || form.name);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <div className="workspace-page">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">SETTINGS</div>
          <h1>Workspace preferences</h1>
          <p className="page-subtitle">
            Update your business profile and account access.
          </p>
        </div>
      </div>

      <section className="workspace-split">
        <article className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-kicker">BUSINESS PROFILE</div>
              <h2>Your business</h2>
            </div>
          </div>

          {loading ? (
            <div className="workspace-empty">
              <LoaderCircle size={28} className="staff-login-spinner" />
              <p>Loading settings…</p>
            </div>
          ) : (
            <form className="workspace-form" onSubmit={handleSave}>
              <label>
                Business name
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, name: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Service type
                <input
                  value={form.serviceType}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      serviceType: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                Phone
                <input
                  value={form.phone}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, phone: event.target.value }))
                  }
                />
              </label>
              {message && <p className="form-inline-success">{message}</p>}
              {error && <p className="form-inline-error">{error}</p>}
              <button className="button button-primary" type="submit" disabled={saving}>
                {saving ? <LoaderCircle size={16} className="staff-login-spinner" /> : <Save size={16} />}
                Save changes
              </button>
            </form>
          )}
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-kicker">ACCOUNT</div>
              <h2>Signed in as</h2>
            </div>
          </div>
          <div className="account-box">
            <strong>{user?.name || "Owner"}</strong>
            <span>{user?.email}</span>
            <span className="muted-text">Role: {user?.role || "owner"}</span>
            <button className="button button-secondary" type="button" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </article>
      </section>
    </div>
  );
}
