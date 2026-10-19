import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Clock3,
  CreditCard,
  Filter,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import api from "../../lib/api";
import {
  avatarTone,
  formatCurrency,
  formatDateTime,
  getInitials,
  greetingForNow,
  statusLabel,
} from "../../lib/auth";

function StatCard({ label, value, change, icon: Icon, tone, description, down }) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <div className="stat-label">{label}</div>
        <div className={`stat-icon ${tone}`}>
          <Icon size={19} strokeWidth={1.8} />
        </div>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-bottom">
        <span className={`stat-change ${down ? "change-down" : ""}`}>
          {down ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
          {change}
        </span>
        <span className="stat-description">{description}</span>
      </div>
    </article>
  );
}

function buildSeries(revenueByDay = [], period, bounds = {}) {
  const now = new Date();
  let start;
  let end = now;

  if (period === "Last 7 days") {
    start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  } else if (period === "Last month") {
    start = bounds.lastMonthStart
      ? new Date(bounds.lastMonthStart)
      : new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = bounds.monthStart
      ? new Date(new Date(bounds.monthStart).getTime() - 1)
      : new Date(now.getFullYear(), now.getMonth(), 0);
  } else {
    start = bounds.monthStart
      ? new Date(bounds.monthStart)
      : new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const days = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cursor <= last) {
    const key = cursor.toISOString().slice(0, 10);
    days.push(key);
    cursor.setDate(cursor.getDate() + 1);
  }

  const map = new Map(
    (revenueByDay || []).map((row) => [row.date, Number(row.total) || 0])
  );
  return days.map((date) => map.get(date) || 0);
}

function RevenueChart({ values }) {
  const max = Math.max(...values, 1);
  const points = values
    .map((value, index) => {
      const x =
        values.length === 1
          ? 300
          : 8 + (index / (values.length - 1)) * 584;
      const y = 190 - (value / max) * 158;
      return `${x},${y}`;
    })
    .join(" ");
  const lastY =
    values.length === 0
      ? 190
      : 190 - (values[values.length - 1] / max) * 158;

  return (
    <div className="chart-wrap">
      <div className="chart-y-labels">
        <span>{formatCurrency(max)}</span>
        <span>{formatCurrency(max / 2)}</span>
        <span>{formatCurrency(max / 4)}</span>
        <span>₹0</span>
      </div>
      <div className="chart-main">
        <svg
          className="revenue-svg"
          viewBox="0 0 600 210"
          preserveAspectRatio="none"
          role="img"
          aria-label="Revenue trend"
        >
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6D72F6" stopOpacity=".24" />
              <stop offset="100%" stopColor="#6D72F6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="revenueLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#9B8BFF" />
              <stop offset="100%" stopColor="#65DCC2" />
            </linearGradient>
          </defs>
          {[32, 85, 138, 190].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="600"
              y2={y}
              stroke="currentColor"
              strokeOpacity=".09"
              strokeDasharray="4 6"
            />
          ))}
          {values.length > 0 && (
            <>
              <polygon points={`8,210 ${points} 592,210`} fill="url(#revenueFill)" />
              <polyline
                points={points}
                fill="none"
                stroke="url(#revenueLine)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx="592"
                cy={lastY}
                r="5"
                fill="#65DCC2"
                stroke="currentColor"
                strokeOpacity=".25"
                strokeWidth="3"
              />
            </>
          )}
        </svg>
        <div className="chart-x-labels">
          <span>Start</span>
          <span>Mid</span>
          <span>End</span>
        </div>
      </div>
    </div>
  );
}

export default function OverviewDashboard({ onNavigate }) {
  const [period, setPeriod] = useState("This month");
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [requests, setRequests] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [summaryRes, requestsRes, invoicesRes, customersRes] =
          await Promise.all([
            api.get("/dashboard/summary"),
            api.get("/service-requests"),
            api.get("/invoices"),
            api.get("/customers"),
          ]);

        setSummary(summaryRes.data.summary || null);
        setRequests(requestsRes.data.serviceRequests || []);
        setInvoices(invoicesRes.data.invoices || []);
        setCustomers(customersRes.data.customers || []);
      } catch (err) {
        setError(
          err.response?.data?.message || "Unable to load dashboard data."
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const go = (path) => {
    if (typeof onNavigate === "function") onNavigate(path);
  };

  const tableRequests = useMemo(() => {
    return requests.map((request) => {
      const customerName = request.customerId?.name || "Customer";
      return {
        id: String(request._id).slice(-6).toUpperCase(),
        rawId: request._id,
        customer: customerName,
        initials: getInitials(customerName),
        color: avatarTone(customerName),
        service: request.serviceType,
        date: formatDateTime(request.scheduledAt),
        status: statusLabel(request.status),
        statusKey: request.status,
        amount:
          invoices.find(
            (invoice) =>
              invoice.serviceRequestId?._id === request._id ||
              invoice.serviceRequestId === request._id
          )?.amount || 0,
      };
    });
  }, [invoices, requests]);

  const filteredRequests = tableRequests.filter((request) =>
    `${request.id} ${request.customer} ${request.service} ${request.status}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );
  const visibleRequests = showAll
    ? filteredRequests
    : filteredRequests.slice(0, 4);

  const totalRequests = summary?.totalRequests ?? 0;
  const completed = summary?.completedRequests ?? 0;
  const inProgress = summary?.inProgressRequests ?? 0;
  const pending = summary?.pendingRequests ?? 0;
  const completionRate = totalRequests
    ? Math.round((completed / totalRequests) * 100)
    : 0;
  const chartValues = useMemo(
    () => buildSeries(summary?.revenueByDay || [], period, summary?.periodBounds || {}),
    [period, summary]
  );
  const revenue = chartValues.reduce((sum, value) => sum + value, 0);
  const donutStyle = useMemo(() => {
    if (!totalRequests) {
      return { background: "#eef0f6" };
    }
    const completedDeg = (completed / totalRequests) * 360;
    const progressDeg = (inProgress / totalRequests) * 360;
    const pendingDeg = Math.max(0, 360 - completedDeg - progressDeg);
    return {
      background: `conic-gradient(#80ddc6 0deg ${completedDeg}deg, #8178f3 ${completedDeg}deg ${completedDeg + progressDeg}deg, #f2bd92 ${completedDeg + progressDeg}deg ${completedDeg + progressDeg + pendingDeg}deg)`,
    };
  }, [completed, inProgress, totalRequests]);

  const activityItems = useMemo(() => {
    const items = [];

    requests.slice(0, 8).forEach((request) => {
      items.push({
        id: `r-${request._id}`,
        at: request.updatedAt || request.createdAt,
        title:
          request.status === "completed"
            ? "Service completed"
            : "Service request update",
        detail: `${request.customerId?.name || "Customer"}'s ${request.serviceType}`,
        tone: request.status === "completed" ? "mint" : "orange",
        icon: request.status === "completed" ? Check : CalendarDays,
      });
    });

    customers.slice(0, 4).forEach((customer) => {
      items.push({
        id: `c-${customer._id}`,
        at: customer.createdAt,
        title: "New customer added",
        detail: `${customer.name} joined your customer list`,
        tone: "violet",
        icon: Users,
      });
    });

    invoices
      .filter((invoice) => invoice.paymentStatus === "paid")
      .slice(0, 4)
      .forEach((invoice) => {
        items.push({
          id: `i-${invoice._id}`,
          at: invoice.paidAt || invoice.updatedAt,
          title: "Payment received",
          detail: `Invoice ${invoice.invoiceNumber} · ${formatCurrency(invoice.amount)}`,
          tone: "blue",
          icon: CreditCard,
        });
      });

    return items
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 4);
  }, [customers, invoices, requests]);

  if (loading) {
    return (
      <div className="workspace-empty large-empty">
        <LoaderCircle size={32} className="staff-login-spinner" />
        <h3>Loading your workspace</h3>
        <p>Pulling live customers, jobs, and revenue.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="workspace-empty large-empty">
        <ClipboardList size={32} />
        <h3>Dashboard unavailable</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="welcome-row">
        <div>
          <div className="eyebrow">
            <span className="live-dot" /> YOUR BUSINESS AT A GLANCE
          </div>
          <h1>
            {greetingForNow()}
            <span className="wave"> ✳</span>
          </h1>
          <p className="page-subtitle">
            Here&apos;s what&apos;s happening with your business today.
          </p>
        </div>
        <div className="welcome-actions">
          <button
            className="button button-primary"
            onClick={() => go("/service-requests")}
          >
            <Plus size={17} /> New service request
          </button>
        </div>
      </div>

      <section className="stats-grid">
        <StatCard
          label="Total customers"
          value={String(summary?.totalCustomers ?? 0)}
          change={`${summary?.unassignedRequests ?? 0} unassigned`}
          description="open jobs waiting"
          icon={Users}
          tone="tone-violet"
        />
        <StatCard
          label="Service requests"
          value={String(totalRequests)}
          change={`${inProgress} in progress`}
          description={`${pending} pending`}
          icon={ClipboardList}
          tone="tone-blue"
        />
        <StatCard
          label="Revenue this month"
          value={formatCurrency(revenue)}
          change={`${completed} completed`}
          description="paid invoices"
          icon={Activity}
          tone="tone-mint"
        />
        <StatCard
          label="Unpaid invoices"
          value={formatCurrency(summary?.unpaidInvoiceAmount ?? 0)}
          change={`${summary?.unpaidInvoices ?? 0} invoices`}
          description="awaiting payment"
          icon={CreditCard}
          tone="tone-orange"
          down
        />
      </section>

      <section className="main-grid">
        <article className="panel revenue-panel">
          <div className="panel-header">
            <div>
              <div className="panel-kicker">REVENUE OVERVIEW</div>
              <h2>Money in motion</h2>
              <p className="panel-description">
                Track your business earnings over time.
              </p>
            </div>
            <label className="select-wrap">
              <CalendarDays size={15} />
              <select
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                aria-label="Revenue period"
              >
                <option>This month</option>
                <option>Last month</option>
                <option>Last 7 days</option>
              </select>
              <ChevronDown size={14} />
            </label>
          </div>
          <div className="revenue-total-row">
            <div>
              <span className="revenue-amount">{formatCurrency(revenue)}</span>
              <span className="revenue-caption">Collected revenue</span>
            </div>
            <div className="revenue-growth">
              <ArrowUpRight size={15} /> {completionRate}% done
            </div>
          </div>
          <RevenueChart values={chartValues} />
          <div className="chart-footnote">
            <span>
              <span className="legend-dot" /> Revenue collected
            </span>
            <span>
              Based on paid invoices · {period}
            </span>
          </div>
        </article>

        <article className="panel requests-panel">
          <div className="panel-header">
            <div>
              <div className="panel-kicker">SERVICE OPERATIONS</div>
              <h2>Request overview</h2>
              <p className="panel-description">A live snapshot of your workload.</p>
            </div>
          </div>
          <div className="request-donut-wrap">
            <div className="donut-chart" style={donutStyle}>
              <div className="donut-center">
                <strong>{totalRequests}</strong>
                <span>Total requests</span>
              </div>
            </div>
            <div className="donut-legend">
              <div>
                <span className="legend-square legend-mint" />
                <span>Completed</span>
                <strong>{completed}</strong>
              </div>
              <div>
                <span className="legend-square legend-violet" />
                <span>In progress</span>
                <strong>{inProgress}</strong>
              </div>
              <div>
                <span className="legend-square legend-orange" />
                <span>Pending</span>
                <strong>{pending}</strong>
              </div>
            </div>
          </div>
          <div className="request-card-footer">
            <div>
              <ShieldCheck size={17} />
              <span>
                {completionRate >= 50
                  ? "Most requests are on track"
                  : "Keep assigning open jobs"}
              </span>
            </div>
            <span className="footer-pill">{completionRate}% completed</span>
          </div>
        </article>
      </section>

      <section className="bottom-grid">
        <article className="panel table-panel">
          <div className="panel-header table-heading">
            <div>
              <div className="panel-kicker">THE LATEST</div>
              <h2>Recent service requests</h2>
              <p className="panel-description">
                Keep track of your latest customer jobs.
              </p>
            </div>
            <button
              className="button button-secondary button-small"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? "Show less" : "View all"} <ArrowRight size={14} />
            </button>
          </div>
          <div className="table-toolbar">
            <div className="table-search">
              <Search size={15} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search requests..."
                aria-label="Search requests"
              />
            </div>
            <button className="filter-button" onClick={() => setQuery("")}>
              <Filter size={14} /> Clear
            </button>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>REQUEST</th>
                  <th>CUSTOMER</th>
                  <th>SERVICE</th>
                  <th>STATUS</th>
                  <th>AMOUNT</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibleRequests.map((request) => (
                  <tr key={request.rawId}>
                    <td>
                      <span className="request-id">{request.id}</span>
                      <span className="request-date">{request.date}</span>
                    </td>
                    <td>
                      <div className="customer-cell">
                        <span className={`customer-avatar avatar-${request.color}`}>
                          {request.initials}
                        </span>
                        <span>{request.customer}</span>
                      </div>
                    </td>
                    <td>{request.service}</td>
                    <td>
                      <span
                        className={`status status-${String(request.statusKey).replace(" ", "-")}`}
                      >
                        <span />
                        {request.status}
                      </span>
                    </td>
                    <td className="amount-cell">
                      {request.amount
                        ? formatCurrency(request.amount)
                        : "—"}
                    </td>
                    <td>
                      <button
                        className="icon-button row-menu"
                        aria-label={`Open ${request.id}`}
                        onClick={() => go("/service-requests")}
                      >
                        <MoreHorizontal size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
                {visibleRequests.length === 0 && (
                  <tr>
                    <td colSpan="6" className="empty-state">
                      No requests match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="table-footer">
            <span>
              Showing {visibleRequests.length} of {filteredRequests.length} requests
            </span>
            <button onClick={() => go("/service-requests")}>
              Manage requests <ArrowRight size={14} />
            </button>
          </div>
        </article>

        <article className="panel activity-panel">
          <div className="panel-header">
            <div>
              <div className="panel-kicker">YOUR WORKSPACE</div>
              <h2>Recent records</h2>
              <p className="panel-description">Latest customers, jobs, and payments.</p>
            </div>
          </div>
          <div className="activity-list">
            {activityItems.map((item) => {
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
                      <Clock3 size={12} /> {formatDateTime(item.at)}
                    </small>
                  </div>
                </div>
              );
            })}
            {activityItems.length === 0 && (
              <div className="workspace-empty">
                <p>Activity will appear as your team works.</p>
              </div>
            )}
          </div>
          <button
            className="activity-all"
            onClick={() => go("/activity")}
          >
            View activity <ArrowRight size={15} />
          </button>
        </article>
      </section>

      <footer className="dashboard-footer">
        <span>© 2026 ServiceFlow</span>
        <span>
          <span className="footer-live-dot" /> All systems ready
        </span>
        <button onClick={() => go("/help")}>
          <CircleHelp size={14} /> Need help?
        </button>
      </footer>
    </>
  );
}
