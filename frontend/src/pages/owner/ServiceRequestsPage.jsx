import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  ClipboardList,
  LoaderCircle,
  Plus,
  RefreshCw,
} from "lucide-react";
import api from "../../lib/api";
import {
  avatarTone,
  formatDateTime,
  getInitials,
  statusLabel,
} from "../../lib/auth";
import { useWorkspace } from "../../lib/workspaceContext";

const emptyForm = {
  customerId: "",
  serviceId: "",
  serviceType: "",
  description: "",
  address: "",
  scheduledAt: "",
  estimatedAmount: "",
};

export default function ServiceRequestsPage() {
  const location = useLocation();
  const { refreshWorkspace } = useWorkspace();
  const [requests, setRequests] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [filter, setFilter] = useState(location.state?.focusFilter || "all");
  const [focusId, setFocusId] = useState(location.state?.focusId || "");
  const [amountDrafts, setAmountDrafts] = useState({});

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [requestsRes, customersRes, staffRes, servicesRes] = await Promise.all([
        api.get("/service-requests"),
        api.get("/customers"),
        api.get("/staff"),
        api.get("/services"),
      ]);
      setRequests(requestsRes.data.serviceRequests || []);
      setCustomers(customersRes.data.customers || []);
      setStaff(staffRes.data.staff || []);
      setServices(servicesRes.data.services || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load service requests.");
    } finally {
      setLoading(false);
    }
  };

  const activeStaff = useMemo(
    () => staff.filter((member) => member.isActive !== false),
    [staff]
  );

  const activeServices = useMemo(
    () => services.filter((s) => s.isActive !== false),
    [services]
  );

  const handleServiceChange = (event) => {
    const serviceId = event.target.value;
    const selectedService = activeServices.find((s) => s._id === serviceId);

    setForm((previous) => ({
      ...previous,
      serviceId,
      // Catalog service: prefill name + price (price stays editable).
      // Custom service: let the owner type the name and price themselves.
      serviceType: selectedService ? selectedService.name : "",
      estimatedAmount: selectedService
        ? String(selectedService.basePrice ?? "")
        : "",
    }));
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (location.state?.focusFilter) setFilter(location.state.focusFilter);
    if (location.state?.focusId) setFocusId(location.state.focusId);
  }, [location.state]);

  useEffect(() => {
    if (!focusId || loading) return;
    const row = document.getElementById(`request-${focusId}`);
    if (!row) return;
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = window.setTimeout(() => setFocusId(""), 2400);
    return () => window.clearTimeout(timer);
  }, [focusId, loading, requests, filter]);

  const visibleRequests = useMemo(() => {
    if (filter === "all") return requests;
    if (filter === "unassigned") {
      return requests.filter(
        (item) =>
          !item.assignedTo &&
          item.status !== "completed" &&
          item.status !== "cancelled"
      );
    }
    return requests.filter((item) => item.status === filter);
  }, [filter, requests]);

  useEffect(() => {
    setAmountDrafts(
      Object.fromEntries(
        requests.map((request) => [
          request._id,
          request.estimatedAmount == null ? "" : String(request.estimatedAmount),
        ])
      )
    );
  }, [requests]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const isCatalogService = Boolean(form.serviceId && form.serviceId !== "custom");
      await api.post("/service-requests", {
        customerId: form.customerId,
        // Send the catalog service id so the backend resolves its name/price;
        // otherwise fall back to the manually typed name.
        serviceType: isCatalogService ? form.serviceId : form.serviceType,
        description: form.description,
        address: form.address,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        estimatedAmount:
          form.estimatedAmount === "" ? null : Number(form.estimatedAmount),
      });
      setForm(emptyForm);
      await loadAll();
      await refreshWorkspace();
    } catch (err) {
      setFormError(err.response?.data?.message || "Could not create request.");
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (requestId, assignedTo) => {
    try {
      await api.patch(`/service-requests/${requestId}/assign`, {
        assignedTo: assignedTo || null,
      });
      await loadAll();
      await refreshWorkspace();
    } catch (err) {
      window.alert(err.response?.data?.message || "Could not assign request.");
    }
  };

  const handleStatus = async (requestId, status) => {
    try {
      await api.put(`/service-requests/${requestId}`, { status });
      await loadAll();
      await refreshWorkspace();
    } catch (err) {
      window.alert(err.response?.data?.message || "Could not update status.");
    }
  };

  const handleAmountSave = async (request, value) => {
    const currentValue =
      request.estimatedAmount == null ? "" : String(request.estimatedAmount);
    if (String(value) === currentValue) return;

    try {
      await api.put(`/service-requests/${request._id}`, {
        estimatedAmount: value === "" ? null : Number(value),
      });
      await loadAll();
      await refreshWorkspace();
    } catch (err) {
      window.alert(err.response?.data?.message || "Could not update price.");
      setAmountDrafts((previous) => ({
        ...previous,
        [request._id]: currentValue,
      }));
    }
  };

  const handleDelete = async (requestId) => {
    if (!window.confirm("Delete this service request?")) return;
    try {
      await api.delete(`/service-requests/${requestId}`);
      await loadAll();
      await refreshWorkspace();
    } catch (err) {
      window.alert(err.response?.data?.message || "Could not delete request.");
    }
  };

  const assignOptionsFor = (request) => {
    const assignedId = request.assignedTo?._id || request.assignedTo;
    const options = [...activeStaff];
    if (assignedId) {
      const current = staff.find((member) => member._id === assignedId);
      if (current && !options.some((member) => member._id === current._id)) {
        options.push(current);
      }
    }
    return options;
  };

  return (
    <div className="workspace-page">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">SERVICE REQUESTS</div>
          <h1>Jobs & assignments</h1>
          <p className="page-subtitle">
            Create jobs, assign technicians, and track progress.
          </p>
        </div>
      </div>

      <section className="workspace-split">
        <article className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-kicker">NEW REQUEST</div>
              <h2>Create service job</h2>
            </div>
          </div>
          <form className="workspace-form" onSubmit={handleCreate}>
            <label>
              Customer
              <select
                value={form.customerId}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    customerId: event.target.value,
                  }))
                }
                required
              >
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer._id} value={customer._id}>
                    {customer.name} · {customer.phone}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Service
              <select
                value={form.serviceId}
                onChange={handleServiceChange}
                required
              >
                <option value="">Select service</option>
                {activeServices.map((service) => (
                  <option key={service._id} value={service._id}>
                    {service.name} - {service.basePrice ? `₹${service.basePrice}` : 'Price not set'}
                  </option>
                ))}
                <option value="custom">Custom service…</option>
              </select>
            </label>
            {form.serviceId === "custom" && (
              <label>
                Custom service name
                <input
                  value={form.serviceType}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      serviceType: event.target.value,
                    }))
                  }
                  placeholder="e.g. Deep cleaning"
                  required
                />
              </label>
            )}
            <label>
              Estimated amount (₹)
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.estimatedAmount}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    estimatedAmount: event.target.value,
                  }))
                }
                placeholder="Auto-filled from service, or enter your own"
              />
            </label>
            <label>
              Address
              <input
                value={form.address}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    address: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label>
              Scheduled at
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    scheduledAt: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label>
              Description
              <input
                value={form.description}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    description: event.target.value,
                  }))
                }
                placeholder="Optional notes"
              />
            </label>
            {formError && <p className="form-inline-error">{formError}</p>}
            <button className="button button-primary" type="submit" disabled={saving}>
              {saving ? <LoaderCircle size={16} className="staff-login-spinner" /> : <Plus size={16} />}
              Create request
            </button>
          </form>
        </article>

        <article className="panel table-panel">
          <div className="panel-header table-heading">
            <div>
              <div className="panel-kicker">OPERATIONS</div>
              <h2>All service requests</h2>
              <p className="panel-description">{visibleRequests.length} shown</p>
            </div>
            <button className="button button-secondary button-small" onClick={loadAll}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          <div className="task-filters workspace-filters">
            {[
              { label: "All", value: "all" },
              { label: "Pending", value: "pending" },
              { label: "In progress", value: "in-progress" },
              { label: "Unassigned", value: "unassigned" },
              { label: "Completed", value: "completed" },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                className={`task-filter ${filter === item.value ? "selected" : ""}`}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="workspace-empty">
              <LoaderCircle size={28} className="staff-login-spinner" />
              <p>Loading requests…</p>
            </div>
          ) : error ? (
            <div className="workspace-empty">
              <ClipboardList size={28} />
              <p>{error}</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>REQUEST</th>
                    <th>CUSTOMER</th>
                    <th>SERVICE</th>
                    <th>AMOUNT (₹)</th>
                    <th>STATUS</th>
                    <th>ASSIGN</th>
                    <th>UPDATE</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visibleRequests.map((request) => {
                    const customer = request.customerId;
                    const customerName = customer?.name || "Customer";
                    const isCompleted = request.status === "completed";
                    return (
                      <tr
                        key={request._id}
                        id={`request-${request._id}`}
                        className={focusId === request._id ? "row-focus" : undefined}
                      >
                        <td>
                          <span className="request-id">
                            {String(request._id).slice(-6).toUpperCase()}
                          </span>
                          <span className="request-date">
                            {formatDateTime(request.scheduledAt)}
                          </span>
                        </td>
                        <td>
                          <div className="customer-cell">
                            <span
                              className={`customer-avatar avatar-${avatarTone(customerName)}`}
                            >
                              {getInitials(customerName)}
                            </span>
                            <span>{customerName}</span>
                          </div>
                        </td>
                        <td>{request.serviceType}</td>
                        <td>
                          <input
                            className="inline-select"
                            type="number"
                            min="0"
                            step="0.01"
                            value={amountDrafts[request._id] ?? ""}
                            onChange={(event) =>
                              setAmountDrafts((previous) => ({
                                ...previous,
                                [request._id]: event.target.value,
                              }))
                            }
                            onBlur={(event) =>
                              handleAmountSave(request, event.target.value)
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") event.currentTarget.blur();
                            }}
                            placeholder="Set price"
                          />
                        </td>
                        <td>
                          <span
                            className={`status status-${String(request.status).replace(" ", "-")}`}
                          >
                            <span />
                            {statusLabel(request.status)}
                          </span>
                        </td>
                        <td>
                          <select
                            className="inline-select"
                            value={request.assignedTo?._id || ""}
                            onChange={(event) =>
                              handleAssign(request._id, event.target.value)
                            }
                            disabled={isCompleted}
                          >
                            <option value="">Unassigned</option>
                            {assignOptionsFor(request).map((member) => (
                              <option key={member._id} value={member._id}>
                                {member.name}
                                {member.isActive === false ? " (inactive)" : ""}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          {isCompleted ? (
                            <span className="muted-text">Staff completed</span>
                          ) : (
                            <select
                              className="inline-select"
                              value={request.status}
                              onChange={(event) =>
                                handleStatus(request._id, event.target.value)
                              }
                            >
                              <option value="pending">Pending</option>
                              <option value="in-progress">In progress</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          )}
                        </td>
                        <td>
                          <button
                            className="button button-secondary button-small"
                            type="button"
                            onClick={() => handleDelete(request._id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {visibleRequests.length === 0 && (
                    <tr>
                      <td colSpan="8" className="empty-state">
                        No service requests in this view.
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
