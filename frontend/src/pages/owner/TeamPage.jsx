import { useEffect, useState } from "react";
import {
  LoaderCircle,
  Plus,
  RefreshCw,
  UserMinus,
  UserCheck,
  Wrench,
} from "lucide-react";
import api from "../../lib/api";
import { formatDate, getInitials } from "../../lib/auth";

export default function TeamPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [createdCreds, setCreatedCreds] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchStaff = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/staff");
      setStaff(response.data.staff || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load team.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setFormError("");
    setCreatedCreds(null);
    setSaving(true);
    try {
      const response = await api.post("/staff", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      setCreatedCreds({
        staffId: response.data.staff?.staffId,
        email: response.data.staff?.email,
        password: form.password,
      });
      setForm({ name: "", email: "", password: "" });
      await fetchStaff();
    } catch (err) {
      setFormError(err.response?.data?.message || "Could not create staff.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (member) => {
    try {
      await api.patch(`/staff/${member._id}/status`, {
        isActive: !member.isActive,
      });
      await fetchStaff();
    } catch (err) {
      window.alert(err.response?.data?.message || "Could not update status.");
    }
  };

  return (
    <div className="workspace-page">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">TEAM</div>
          <h1>Technicians & staff</h1>
          <p className="page-subtitle">
            Create staff accounts and control who can take jobs.
          </p>
        </div>
      </div>

      <section className="workspace-split">
        <article className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-kicker">NEW STAFF</div>
              <h2>Add team member</h2>
            </div>
          </div>
          <form className="workspace-form" onSubmit={handleCreate}>
            <label>
              Name
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, name: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, email: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Temporary password
              <input
                type="password"
                minLength={8}
                value={form.password}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    password: event.target.value,
                  }))
                }
                required
              />
            </label>
            {formError && <p className="form-inline-error">{formError}</p>}
            {createdCreds && (
              <div className="success-note">
                <strong>Staff created</strong>
                <span>Staff ID: {createdCreds.staffId}</span>
                <span>Share the Staff ID and password for portal login.</span>
              </div>
            )}
            <button className="button button-primary" type="submit" disabled={saving}>
              {saving ? <LoaderCircle size={16} className="staff-login-spinner" /> : <Plus size={16} />}
              Create staff account
            </button>
          </form>
        </article>

        <article className="panel table-panel">
          <div className="panel-header table-heading">
            <div>
              <div className="panel-kicker">ROSTER</div>
              <h2>Your team</h2>
              <p className="panel-description">{staff.length} members</p>
            </div>
            <button className="button button-secondary button-small" onClick={fetchStaff}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="workspace-empty">
              <LoaderCircle size={28} className="staff-login-spinner" />
              <p>Loading team…</p>
            </div>
          ) : error ? (
            <div className="workspace-empty">
              <Wrench size={28} />
              <p>{error}</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>MEMBER</th>
                    <th>STAFF ID</th>
                    <th>STATUS</th>
                    <th>JOINED</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {staff.map((member) => (
                    <tr key={member._id}>
                      <td>
                        <div className="customer-cell">
                          <span className="customer-avatar avatar-violet">
                            {getInitials(member.name)}
                          </span>
                          <div>
                            <div>{member.name}</div>
                            <small className="muted-text">{member.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="request-id">{member.staffId || "—"}</span>
                      </td>
                      <td>
                        <span
                          className={`status status-${member.isActive ? "completed" : "cancelled"}`}
                        >
                          <span />
                          {member.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{formatDate(member.createdAt)}</td>
                      <td>
                        <button
                          className="button button-secondary button-small"
                          onClick={() => toggleActive(member)}
                        >
                          {member.isActive ? (
                            <>
                              <UserMinus size={14} /> Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck size={14} /> Activate
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {staff.length === 0 && (
                    <tr>
                      <td colSpan="5" className="empty-state">
                        No staff yet. Create a technician account to assign jobs.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
