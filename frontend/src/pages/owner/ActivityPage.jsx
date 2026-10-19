import { useEffect, useState } from "react";
import {
  Activity,
  CalendarDays,
  Check,
  Clock3,
  CreditCard,
  LoaderCircle,
  Users,
} from "lucide-react";
import api from "../../lib/api";
import { formatCurrency, formatDateTime } from "../../lib/auth";

function relativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function ActivityPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [requestsRes, customersRes, invoicesRes] = await Promise.all([
          api.get("/service-requests"),
          api.get("/customers"),
          api.get("/invoices"),
        ]);

        const activities = [];

        (requestsRes.data.serviceRequests || []).forEach((request) => {
          activities.push({
            id: `req-${request._id}`,
            at: request.updatedAt || request.createdAt,
            title:
              request.status === "completed"
                ? "Service completed"
                : "Service request update",
            detail: `${request.customerId?.name || "Customer"} · ${request.serviceType}`,
            tone: request.status === "completed" ? "mint" : "orange",
            icon: request.status === "completed" ? Check : CalendarDays,
          });
        });

        (customersRes.data.customers || []).forEach((customer) => {
          activities.push({
            id: `cus-${customer._id}`,
            at: customer.createdAt,
            title: "New customer added",
            detail: `${customer.name} joined your customer list`,
            tone: "violet",
            icon: Users,
          });
        });

        (invoicesRes.data.invoices || []).forEach((invoice) => {
          if (invoice.paymentStatus === "paid") {
            activities.push({
              id: `inv-${invoice._id}`,
              at: invoice.paidAt || invoice.updatedAt,
              title: "Payment received",
              detail: `Invoice ${invoice.invoiceNumber} · ${formatCurrency(invoice.amount)}`,
              tone: "blue",
              icon: CreditCard,
            });
          }
        });

        activities.sort((a, b) => new Date(b.at) - new Date(a.at));
        setItems(activities.slice(0, 40));
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load activity.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="workspace-page">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">ACTIVITY</div>
          <h1>Workspace activity</h1>
          <p className="page-subtitle">
            Recent changes across customers, jobs, and payments.
          </p>
        </div>
      </div>

      <article className="panel activity-panel activity-full">
        {loading ? (
          <div className="workspace-empty">
            <LoaderCircle size={28} className="staff-login-spinner" />
            <p>Loading activity…</p>
          </div>
        ) : error ? (
          <div className="workspace-empty">
            <Activity size={28} />
            <p>{error}</p>
          </div>
        ) : (
          <div className="activity-list">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <div className="activity-item" key={item.id}>
                  <div className={`activity-icon activity-${item.tone}`}>
                    <Icon size={16} />
                  </div>
                  <div className="activity-content">
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                    <small>
                      <Clock3 size={12} /> {relativeTime(item.at)} ·{" "}
                      {formatDateTime(item.at)}
                    </small>
                  </div>
                </div>
              );
            })}
            {items.length === 0 && (
              <div className="workspace-empty">
                <Activity size={28} />
                <p>No activity yet. It will appear as you use ServiceFlow.</p>
              </div>
            )}
          </div>
        )}
      </article>
    </div>
  );
}
