import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { LoaderCircle, Pencil, Plus, RefreshCw, Trash2, Users, X } from "lucide-react";
import api from "../../lib/api";
import { avatarTone, formatDate, getInitials } from "../../lib/auth";
import { useWorkspace } from "../../lib/workspaceContext";

export default function CustomersPage() {
  const location = useLocation();
  const { refreshWorkspace } = useWorkspace();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [focusId, setFocusId] = useState(location.state?.focusId || "");

  const fetchCustomers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/customers");
      setCustomers(response.data.customers || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (location.state?.focusId) {
      setFocusId(location.state.focusId);
    }
  }, [location.state]);

  useEffect(() => {
    if (!focusId || loading) return;
    const row = document.getElementById(`customer-${focusId}`);
    if (!row) return;
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = window.setTimeout(() => setFocusId(""), 2400);
    return () => window.clearTimeout(timer);
  }, [focusId, loading, customers]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      await api.post("/customers", { name: name.trim(), phone: phone.trim() });
      setName("");
      setPhone("");
      await fetchCustomers();
      await refreshWorkspace();
    } catch (err) {
      setFormError(err.response?.data?.message || "Could not add customer.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (customer) => {
    setEditing(customer);
    setEditName(customer.name || "");
    setEditPhone(customer.phone || "");
    setEditError("");
  };

  const handleEdit = async (event) => {
    event.preventDefault();
    if (!editing) return;
    setEditSaving(true);
    setEditError("");
    try {
      await api.put(`/customers/${editing._id}`, {
        name: editName.trim(),
        phone: editPhone.trim(),
      });
      setEditing(null);
      await fetchCustomers();
      await refreshWorkspace();
    } catch (err) {
      setEditError(err.response?.data?.message || "Could not update customer.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this customer?")) return;
    try {
      await api.delete(`/customers/${id}`);
      setCustomers((previous) => previous.filter((item) => item._id !== id));
      await refreshWorkspace();
    } catch (err) {
      window.alert(err.response?.data?.message || "Could not delete customer.");
    }
  };

  return (
    <div className="workspace-page">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">CUSTOMERS</div>
          <h1>Your customer list</h1>
          <p className="page-subtitle">
            Manage customer details for every service job.
          </p>
        </div>
      </div>

      <section className="workspace-split">
        <article className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-kicker">ADD CUSTOMER</div>
              <h2>New customer</h2>
            </div>
          </div>
          <form className="workspace-form" onSubmit={handleCreate}>
            <label>
              Name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Customer name"
                required
              />
            </label>
            <label>
              Phone
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Phone number"
                required
              />
            </label>
            {formError && <p className="form-inline-error">{formError}</p>}
            <button className="button button-primary" type="submit" disabled={saving}>
              {saving ? <LoaderCircle size={16} className="staff-login-spinner" /> : <Plus size={16} />}
              Add customer
            </button>
          </form>
        </article>

        <article className="panel table-panel">
          <div className="panel-header table-heading">
            <div>
              <div className="panel-kicker">DIRECTORY</div>
              <h2>All customers</h2>
              <p className="panel-description">{customers.length} in your workspace</p>
            </div>
            <button className="button button-secondary button-small" onClick={fetchCustomers}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="workspace-empty">
              <LoaderCircle size={28} className="staff-login-spinner" />
              <p>Loading customers…</p>
            </div>
          ) : error ? (
            <div className="workspace-empty">
              <Users size={28} />
              <p>{error}</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>CUSTOMER</th>
                    <th>PHONE</th>
                    <th>ADDED</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr
                      key={customer._id}
                      id={`customer-${customer._id}`}
                      className={focusId === customer._id ? "row-focus" : undefined}
                    >
                      <td>
                        <div className="customer-cell">
                          <span className={`customer-avatar avatar-${avatarTone(customer.name)}`}>
                            {getInitials(customer.name)}
                          </span>
                          <span>{customer.name}</span>
                        </div>
                      </td>
                      <td>{customer.phone}</td>
                      <td>{formatDate(customer.createdAt)}</td>
                      <td className="row-actions">
                        <button
                          className="icon-button row-menu"
                          aria-label={`Edit ${customer.name}`}
                          onClick={() => startEdit(customer)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="icon-button row-menu"
                          aria-label={`Delete ${customer.name}`}
                          onClick={() => handleDelete(customer._id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {customers.length === 0 && (
                    <tr>
                      <td colSpan="4" className="empty-state">
                        No customers yet. Add your first customer to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      {editing && (
        <div className="modal-backdrop" role="presentation" onClick={() => setEditing(null)}>
          <form
            className="modal-card workspace-form"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleEdit}
          >
            <div className="modal-header">
              <h2>Edit customer</h2>
              <button
                type="button"
                className="icon-button"
                aria-label="Close"
                onClick={() => setEditing(null)}
              >
                <X size={18} />
              </button>
            </div>
            <label>
              Name
              <input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                required
              />
            </label>
            <label>
              Phone
              <input
                value={editPhone}
                onChange={(event) => setEditPhone(event.target.value)}
                required
              />
            </label>
            {editError && <p className="form-inline-error">{editError}</p>}
            <button className="button button-primary" type="submit" disabled={editSaving}>
              {editSaving ? (
                <LoaderCircle size={16} className="staff-login-spinner" />
              ) : null}
              Save changes
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
