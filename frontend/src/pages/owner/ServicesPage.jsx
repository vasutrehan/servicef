import { useEffect, useState } from "react";
import {
  DollarSign,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import api from "../../lib/api";
import { formatCurrency } from "../../lib/auth";

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    basePrice: "",
    category: "",
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchServices = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/services");
      setServices(response.data.services || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load services.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      await api.post("/services", {
        ...form,
        basePrice: Number(form.basePrice),
      });
      setForm({ name: "", description: "", basePrice: "", category: "", isActive: true });
      setShowForm(false);
      await fetchServices();
    } catch (err) {
      setFormError(err.response?.data?.message || "Could not create service.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      await api.put(`/services/${editingService._id}`, {
        ...form,
        basePrice: Number(form.basePrice),
      });
      setForm({ name: "", description: "", basePrice: "", category: "", isActive: true });
      setEditingService(null);
      setShowForm(false);
      await fetchServices();
    } catch (err) {
      setFormError(err.response?.data?.message || "Could not update service.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setForm({
      name: service.name,
      description: service.description,
      basePrice: service.basePrice,
      category: service.category,
      isActive: service.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (serviceId) => {
    if (!window.confirm("Delete this service? This cannot be undone.")) return;
    try {
      await api.delete(`/services/${serviceId}`);
      await fetchServices();
    } catch (err) {
      window.alert(err.response?.data?.message || "Could not delete service.");
    }
  };

  const handleToggleActive = async (service) => {
    try {
      await api.put(`/services/${service._id}`, {
        isActive: !service.isActive,
      });
      await fetchServices();
    } catch (err) {
      window.alert(err.response?.data?.message || "Could not update service.");
    }
  };

  const resetForm = () => {
    setForm({ name: "", description: "", basePrice: "", category: "", isActive: true });
    setEditingService(null);
    setShowForm(false);
    setFormError("");
  };

  const activeServices = services.filter((s) => s.isActive);
  const inactiveServices = services.filter((s) => !s.isActive);

  return (
    <div className="workspace-page">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">SERVICES</div>
          <h1>Service catalog</h1>
          <p className="page-subtitle">
            Define your services with standard prices for consistent billing.
          </p>
        </div>
        <button
          className="button button-primary"
          onClick={() => setShowForm(true)}
        >
          <Plus size={17} /> Add service
        </button>
      </div>

      {showForm && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-kicker">
                {editingService ? "EDIT SERVICE" : "NEW SERVICE"}
              </div>
              <h2>{editingService ? "Update service details" : "Add new service"}</h2>
            </div>
            <button className="icon-button" onClick={resetForm}>
              <X size={18} />
            </button>
          </div>
          <form
            className="workspace-form"
            onSubmit={editingService ? handleUpdate : handleCreate}
          >
            <label>
              Service name
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                placeholder="AC Repair"
                required
              />
            </label>
            <label>
              Category (optional)
              <input
                value={form.category}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    category: event.target.value,
                  }))
                }
                placeholder="Cooling, Heating, Plumbing..."
              />
            </label>
            <label>
              Base price (₹)
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.basePrice}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    basePrice: event.target.value,
                  }))
                }
                placeholder="500"
                required
              />
            </label>
            <label>
              Description (optional)
              <input
                value={form.description}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    description: event.target.value,
                  }))
                }
                placeholder="Basic AC repair service"
              />
            </label>
            {formError && <p className="form-inline-error">{formError}</p>}
            <button className="button button-primary" type="submit" disabled={saving}>
              {saving ? (
                <LoaderCircle size={16} className="staff-login-spinner" />
              ) : editingService ? (
                "Update service"
              ) : (
                <>
                  <Plus size={16} /> Create service
                </>
              )}
            </button>
          </form>
        </section>
      )}

      <section className="panel table-panel">
        <div className="panel-header table-heading">
          <div>
            <div className="panel-kicker">CATALOG</div>
            <h2>Your services</h2>
            <p className="panel-description">{activeServices.length} active</p>
          </div>
          <button className="button button-secondary button-small" onClick={fetchServices}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="workspace-empty">
            <LoaderCircle size={28} className="staff-login-spinner" />
            <p>Loading services…</p>
          </div>
        ) : error ? (
          <div className="workspace-empty">
            <DollarSign size={28} />
            <p>{error}</p>
          </div>
        ) : services.length === 0 ? (
          <div className="workspace-empty">
            <DollarSign size={28} />
            <p>No services yet. Add your first service to start.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>SERVICE</th>
                  <th>CATEGORY</th>
                  <th>BASE PRICE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {activeServices.map((service) => (
                  <tr key={service._id}>
                    <td>
                      <strong>{service.name}</strong>
                      {service.description && (
                        <small className="muted-text">{service.description}</small>
                      )}
                    </td>
                    <td>{service.category || "—"}</td>
                    <td className="amount-cell">{formatCurrency(service.basePrice)}</td>
                    <td>
                      <span className="status status-completed">
                        <span /> Active
                      </span>
                    </td>
                    <td className="row-actions">
                      <button
                        className="button button-secondary button-small"
                        onClick={() => handleEdit(service)}
                      >
                        Edit
                      </button>
                      <button
                        className="button button-secondary button-small"
                        onClick={() => handleToggleActive(service)}
                      >
                        Deactivate
                      </button>
                      <button
                        className="button button-secondary button-small"
                        onClick={() => handleDelete(service._id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {inactiveServices.map((service) => (
                  <tr key={service._id} className="row-inactive">
                    <td>
                      <strong>{service.name}</strong>
                      {service.description && (
                        <small className="muted-text">{service.description}</small>
                      )}
                    </td>
                    <td>{service.category || "—"}</td>
                    <td className="amount-cell">{formatCurrency(service.basePrice)}</td>
                    <td>
                      <span className="status status-cancelled">
                        <span /> Inactive
                      </span>
                    </td>
                    <td className="row-actions">
                      <button
                        className="button button-secondary button-small"
                        onClick={() => handleToggleActive(service)}
                      >
                        Activate
                      </button>
                      <button
                        className="button button-secondary button-small"
                        onClick={() => handleDelete(service._id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
