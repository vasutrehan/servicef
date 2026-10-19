import { useEffect, useState } from "react";
import {
  CalendarDays,
  Check,
  Clock3,
  LoaderCircle,
  MapPin,
  Phone,
  Play,
  RefreshCw,
  ClipboardList,
  X,
} from "lucide-react";
import api from "../../lib/api";

const statusLabels = {
  pending: "Pending",
  "in-progress": "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

function formatTime(value) {
  if (!value) return "Time not scheduled";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Time not scheduled";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function normalizeTask(task) {
  const customer = task.customerId || task.customer || {};

  return {
    id: task._id,
    service: task.serviceType || "Service request",
    customer: customer.name || "Customer",
    phone: customer.phone || "",
    address: task.address || task.location || "Address not provided",
    time: formatTime(task.scheduledAt),
    scheduledAt: task.scheduledAt,
    status: task.status || "pending",
    description: task.description || "",
    estimatedAmount: task.estimatedAmount ?? "",
  };
}

export default function MyTasks() {
  const [filter, setFilter] = useState("all");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const [amount, setAmount] = useState("");
  const [updating, setUpdating] = useState(false);
  const [actionError, setActionError] = useState("");

  const fetchTasks = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/service-requests/my-tasks");
      const taskData = response.data.tasks || [];
      setTasks(taskData.map(normalizeTask));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load your tasks right now."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const visibleTasks = tasks.filter((task) => {
    if (filter === "all") return true;
    if (filter === "assigned") {
      return task.status === "pending";
    }
    return task.status === filter;
  });

  const completedCount = tasks.filter(
    (task) => task.status === "completed"
  ).length;

  const [notice, setNotice] = useState("");

  const updateStatus = async (taskId, status, finalAmount) => {
    setUpdating(true);
    setActionError("");
    setNotice("");
    try {
      const payload = { status };
      if (status === "completed") {
        payload.amount = Number(finalAmount);
      }
      const response = await api.patch(
        `/service-requests/${taskId}/status`,
        payload
      );
      setSelectedTask(null);
      setAmount("");
      if (status === "completed") {
        const parts = [];
        if (response.data.paymentLinkCreated) {
          parts.push("Payment link created for the customer.");
        } else if (response.data.paymentLinkError) {
          parts.push("Job completed, but the online payment link could not be created.");
        }
        if (response.data.whatsappSent === false) {
          parts.push("WhatsApp notice could not be sent — ask the owner to resend from Invoices.");
        } else if (response.data.whatsappSent) {
          parts.push("Customer notified on WhatsApp.");
        }
        if (parts.length) setNotice(parts.join(" "));
      }
      await fetchTasks();
    } catch (err) {
      setActionError(
        err.response?.data?.message || "Could not update task status."
      );
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="my-tasks-page">
      <div className="tasks-heading">
        <div>
          <p className="staff-eyebrow">YOUR WORKSPACE</p>
          <h1>My Tasks</h1>
          <p className="staff-subtitle">
            Your assigned service jobs in one place.
          </p>
        </div>

        <div className="tasks-heading-icon">
          <ClipboardList size={23} />
        </div>
      </div>

      <div className="task-summary">
        <div className="task-summary-card">
          <span>Assigned jobs</span>
          <strong>{tasks.length}</strong>
          <small>Assigned to you</small>
        </div>

        <div className="task-summary-card completed-summary">
          <span>Completed</span>
          <strong>{completedCount}</strong>
          <small>Your progress</small>
        </div>
      </div>

      <div className="tasks-section-heading">
        <h2>Service jobs</h2>
        <span>{visibleTasks.length} jobs</span>
      </div>

      <div className="task-filters">
        {[
          { label: "All", value: "all" },
          { label: "Assigned", value: "assigned" },
          { label: "In progress", value: "in-progress" },
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
        <div className="tasks-empty">
          <LoaderCircle size={28} className="staff-login-spinner" />
          <h3>Loading your tasks</h3>
          <p>Your assigned jobs will appear here.</p>
        </div>
      ) : error ? (
        <div className="tasks-empty">
          <ClipboardList size={28} />
          <h3>Couldn&apos;t load tasks</h3>
          <p>{error}</p>
          <button type="button" className="task-view-button" onClick={fetchTasks}>
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      ) : (
        <div className="task-list">
          {visibleTasks.map((task) => (
            <article className="task-card" key={task.id}>
              <div className="task-card-top">
                <div>
                  <span className="task-id">
                    {task.id ? String(task.id).slice(-6).toUpperCase() : "TASK"}
                  </span>
                  <h3>{task.service}</h3>
                </div>

                <span className={`task-status status-${task.status}`}>
                  {statusLabels[task.status] || task.status}
                </span>
              </div>

              <div className="task-customer">
                <div className="customer-avatar">
                  {task.customer.charAt(0).toUpperCase()}
                </div>
                <div>
                  <strong>{task.customer}</strong>
                  <span>Customer</span>
                </div>

                {task.phone && (
                  <a
                    className="task-call-button"
                    href={`tel:${task.phone}`}
                    aria-label={`Call ${task.customer}`}
                  >
                    <Phone size={17} />
                  </a>
                )}
              </div>

              <div className="task-detail">
                <Clock3 size={17} />
                <span>{task.time}</span>
              </div>

              <div className="task-detail">
                <MapPin size={17} />
                <span>{task.address}</span>
              </div>

              <div className="task-card-footer task-actions">
                <a
                  className="task-directions"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.address)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin size={16} />
                  Directions
                </a>

                {task.status === "pending" && (
                  <button
                    type="button"
                    className="task-view-button"
                    onClick={() => updateStatus(task.id, "in-progress")}
                    disabled={updating}
                  >
                    <Play size={16} />
                    Start job
                  </button>
                )}

                {task.status === "in-progress" && (
                  <button
                    type="button"
                    className="task-view-button"
                    onClick={() => {
                      setSelectedTask(task);
                      setAmount(
                        task.estimatedAmount == null || task.estimatedAmount === ""
                          ? ""
                          : String(task.estimatedAmount)
                      );
                      setActionError("");
                    }}
                  >
                    <Check size={16} />
                    Complete
                  </button>
                )}

                {task.status === "completed" && (
                  <button
                    type="button"
                    className="task-view-button"
                    onClick={() => setSelectedTask(task)}
                  >
                    View details
                  </button>
                )}
              </div>
            </article>
          ))}

          {visibleTasks.length === 0 && (
            <div className="tasks-empty">
              <CalendarDays size={28} />
              <h3>No tasks here</h3>
              <p>There are no jobs in this category.</p>
            </div>
          )}
        </div>
      )}

      {selectedTask && (
        <div className="staff-modal-backdrop">
          <div className="staff-modal">
            <div className="staff-modal-header">
              <h3>{selectedTask.service}</h3>
              <button
                type="button"
                className="icon-button"
                onClick={() => setSelectedTask(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <p>{selectedTask.description || "No additional description."}</p>
            <p>
              <strong>{selectedTask.customer}</strong> · {selectedTask.address}
            </p>

            {selectedTask.status === "in-progress" && (
              <>
                <label className="staff-amount-label">
                  Final amount (₹)
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="e.g. 1500"
                  />
                </label>
                {actionError && <p className="staff-login-error">{actionError}</p>}
                <button
                  type="button"
                  className="staff-login-submit"
                  disabled={updating || !amount}
                  onClick={() =>
                    updateStatus(selectedTask.id, "completed", amount)
                  }
                >
                  {updating ? (
                    <>
                      <LoaderCircle size={18} className="staff-login-spinner" />
                      Completing...
                    </>
                  ) : (
                    "Complete & create invoice"
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
