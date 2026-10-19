import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bell,
  Calendar,
  ChevronRight,
  ClipboardList,
  Command,
  CreditCard,
  DollarSign,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Search,
  Settings2,
  Users,
  Wrench,
  X,
} from "lucide-react";
import "./index.css";
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import StaffLayout from "./layouts/StaffLayout";
import MyTasks from "./pages/staff/MyTasks";
import StaffLogin from "./pages/staff/StaffLogin";
import StaffSchedule from "./pages/staff/StaffSchedule";
import StaffProfile from "./pages/staff/StaffProfile";
import OwnerLogin from "./pages/auth/OwnerLogin";
import OwnerRegister from "./pages/auth/OwnerRegister";
import Onboarding from "./pages/auth/Onboarding";
import ProtectedRoute from "./components/ProtectedRoute";
import OverviewDashboard from "./pages/owner/OverviewDashboard";
import CustomersPage from "./pages/owner/CustomersPage";
import ServiceRequestsPage from "./pages/owner/ServiceRequestsPage";
import ServicesPage from "./pages/owner/ServicesPage";
import TeamPage from "./pages/owner/TeamPage";
import CalendarPage from "./pages/owner/CalendarPage";
import InvoicesPage from "./pages/owner/InvoicesPage";
import ActivityPage from "./pages/owner/ActivityPage";
import SettingsPage from "./pages/owner/SettingsPage";
import HelpPage from "./pages/owner/HelpPage";
import api from "./lib/api";
import {
  clearSession,
  formatCurrency,
  formatRelativeTime,
  getInitials,
  getStoredUser,
  setSession,
} from "./lib/auth";
import { WorkspaceProvider } from "./lib/workspaceContext";

const navGroups = [
  {
    label: "WORKSPACE",
    items: [
      { label: "Overview", icon: LayoutDashboard, path: "/" },
      { label: "Service requests", icon: ClipboardList, path: "/service-requests" },
      { label: "Services", icon: DollarSign, path: "/services" },
      { label: "Calendar", icon: Calendar, path: "/calendar" },
      { label: "Customers", icon: Users, path: "/customers" },
      { label: "Team", icon: Wrench, path: "/team" },
    ],
  },
  {
    label: "BUSINESS",
    items: [
      { label: "Invoices & payments", icon: CreditCard, path: "/invoices" },
      { label: "Activity", icon: Activity, path: "/activity" },
    ],
  },
];

const pathTitles = {
  "/": "Overview",
  "/service-requests": "Service requests",
  "/services": "Services",
  "/calendar": "Calendar",
  "/customers": "Customers",
  "/team": "Team",
  "/invoices": "Invoices & payments",
  "/activity": "Activity",
  "/settings": "Settings",
  "/help": "Help & support",
};

function Sidebar({
  open,
  close,
  businessName,
  ownerName,
  requestCount,
  onLogout,
}) {
  return (
    <>
      {open && (
        <button
          className="sidebar-backdrop"
          onClick={close}
          aria-label="Close navigation"
        />
      )}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Command size={22} strokeWidth={2.5} />
          </div>
          <div>
            <div className="brand-name">
              serviceflow<span>.</span>
            </div>
            <div className="brand-caption">BUSINESS OS</div>
          </div>
          <button
            className="icon-button mobile-close"
            onClick={close}
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>

        <NavLink
          to="/settings"
          className="workspace-badge"
          onClick={close}
          aria-label="Open business settings"
        >
          <div className="workspace-avatar">
            {(businessName || "S").charAt(0).toUpperCase()}
          </div>
          <div className="workspace-copy">
            <strong>{businessName || "ServiceFlow Co."}</strong>
            <span>Current business</span>
          </div>
          <Settings2 size={14} className="muted-icon" />
        </NavLink>

        <div className="nav-scroll">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <div className="nav-label">{group.label}</div>
              {group.items.map(({ label, icon: Icon, path }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === "/"}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? "nav-item-active" : ""}`
                  }
                  onClick={close}
                >
                  <Icon size={18} strokeWidth={1.8} />
                  <span>{label}</span>
                  {label === "Service requests" && requestCount > 0 && (
                    <span className="nav-count">{requestCount}</span>
                  )}
                  <span className="nav-active-dot" />
                </NavLink>
              ))}
            </div>
          ))}
        </div>

        <div className="sidebar-bottom">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `nav-item bottom-nav ${isActive ? "nav-item-active" : ""}`
            }
            onClick={close}
          >
            <Settings2 size={18} />
            <span>Settings</span>
          </NavLink>
          <NavLink
            to="/help"
            className={({ isActive }) =>
              `nav-item bottom-nav ${isActive ? "nav-item-active" : ""}`
            }
            onClick={close}
          >
            <LifeBuoy size={18} />
            <span>Help & support</span>
          </NavLink>
          <div className="profile-row">
            <div className="profile-avatar">{getInitials(ownerName)}</div>
            <div className="profile-info">
              <strong>{ownerName || "Business Owner"}</strong>
              <span>Workspace admin</span>
            </div>
            <button
              className="icon-button"
              onClick={onLogout}
              aria-label="Sign out"
              type="button"
            >
              <LogOut size={16} className="muted-icon" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function OwnerDashboardApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchWrapRef = useRef(null);
  const notificationWrapRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [user, setUser] = useState(getStoredUser());
  const [businessName, setBusinessName] = useState("ServiceFlow Co.");
  const [openRequestCount, setOpenRequestCount] = useState(0);
  const [bootstrapError, setBootstrapError] = useState("");
  const [searchIndex, setSearchIndex] = useState({
    customers: [],
    requests: [],
    invoices: [],
  });
  const [notifications, setNotifications] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(() => new Set());

  const activePage = pathTitles[location.pathname] || "Overview";

  const refreshWorkspace = useCallback(async () => {
    try {
      const [meRes, businessRes, requestsRes, customersRes, invoicesRes] =
        await Promise.all([
          api.get("/auth/me"),
          api.get("/businesses/my-business"),
          api.get("/service-requests"),
          api.get("/customers"),
          api.get("/invoices"),
        ]);

      const nextUser = meRes.data.user;
      setUser(nextUser);
      setSession(localStorage.getItem("token"), nextUser);
      setBusinessName(businessRes.data.business?.name || "ServiceFlow Co.");
      setBootstrapError("");

      const requests = requestsRes.data.serviceRequests || [];
      const customers = customersRes.data.customers || [];
      const invoices = invoicesRes.data.invoices || [];

      const openCount = requests.filter(
        (request) =>
          request.status === "pending" || request.status === "in-progress"
      ).length;
      setOpenRequestCount(openCount);

      setSearchIndex({ customers, requests, invoices });

      const nextNotifications = [];
      const unpaid = invoices.filter((invoice) => invoice.paymentStatus === "pending");
      unpaid.slice(0, 5).forEach((invoice) => {
        nextNotifications.push({
          id: `inv-${invoice._id}`,
          title: "Unpaid invoice",
          detail: `${invoice.invoiceNumber} · ${formatCurrency(invoice.amount)}`,
          path: "/invoices",
          focusId: invoice._id,
          at: invoice.updatedAt || invoice.createdAt,
        });
      });

      requests
        .filter(
          (request) =>
            !request.assignedTo &&
            request.status !== "completed" &&
            request.status !== "cancelled"
        )
        .slice(0, 5)
        .forEach((request) => {
          nextNotifications.push({
            id: `req-${request._id}`,
            title: "Unassigned job",
            detail: `${request.customerId?.name || "Customer"} · ${request.serviceType}`,
            path: "/service-requests",
            focusId: request._id,
            focusFilter: "unassigned",
            at: request.updatedAt || request.createdAt,
          });
        });

      setNotifications(nextNotifications);
      setDismissedIds((previous) => {
        const liveIds = new Set(nextNotifications.map((item) => item.id));
        const next = new Set();
        previous.forEach((id) => {
          if (liveIds.has(id)) next.add(id);
        });
        return next;
      });
    } catch (err) {
      if (err.response?.status === 401) return;
      setBootstrapError(
        err.response?.data?.message || "Could not refresh workspace data."
      );
    }
  }, []);

  useEffect(() => {
    refreshWorkspace();
  }, [refreshWorkspace]);

  useEffect(() => {
    const onFocus = () => refreshWorkspace();
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshWorkspace();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const intervalId = window.setInterval(refreshWorkspace, 60000);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(intervalId);
    };
  }, [refreshWorkspace]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (
        searchOpen &&
        searchWrapRef.current &&
        !searchWrapRef.current.contains(event.target)
      ) {
        setSearchOpen(false);
        setGlobalSearch("");
      }
      if (
        notificationsOpen &&
        notificationWrapRef.current &&
        !notificationWrapRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [searchOpen, notificationsOpen]);

  const visibleNotifications = useMemo(
    () => notifications.filter((item) => !dismissedIds.has(item.id)),
    [notifications, dismissedIds]
  );

  const searchResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return [];

    const results = [];

    searchIndex.customers.forEach((customer) => {
      const haystack = `${customer.name} ${customer.phone}`.toLowerCase();
      if (haystack.includes(q)) {
        results.push({
          id: `c-${customer._id}`,
          type: "Customer",
          label: customer.name,
          meta: customer.phone,
          path: "/customers",
          focusId: customer._id,
        });
      }
    });

    searchIndex.requests.forEach((request) => {
      const haystack =
        `${request.serviceType} ${request.customerId?.name || ""} ${request.status}`.toLowerCase();
      if (haystack.includes(q)) {
        results.push({
          id: `r-${request._id}`,
          type: "Job",
          label: request.serviceType,
          meta: `${request.customerId?.name || "Customer"} · ${request.status}`,
          path: "/service-requests",
          focusId: request._id,
        });
      }
    });

    searchIndex.invoices.forEach((invoice) => {
      const haystack =
        `${invoice.invoiceNumber} ${invoice.customerId?.name || ""} ${invoice.paymentStatus}`.toLowerCase();
      if (haystack.includes(q)) {
        results.push({
          id: `i-${invoice._id}`,
          type: "Invoice",
          label: invoice.invoiceNumber,
          meta: `${invoice.customerId?.name || "Customer"} · ${formatCurrency(invoice.amount)}`,
          path: "/invoices",
          focusId: invoice._id,
        });
      }
    });

    return results.slice(0, 8);
  }, [globalSearch, searchIndex]);

  const handleLogout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  const goToResult = (result) => {
    setGlobalSearch("");
    setSearchOpen(false);
    navigate(result.path, {
      state: { focusId: result.focusId },
    });
  };

  const goToNotification = (item) => {
    setDismissedIds((previous) => new Set(previous).add(item.id));
    setNotificationsOpen(false);
    navigate(item.path, {
      state: {
        focusId: item.focusId,
        focusFilter: item.focusFilter,
      },
    });
  };

  const dismissAllNotifications = () => {
    setDismissedIds(new Set(notifications.map((item) => item.id)));
    setNotificationsOpen(false);
  };

  const workspaceValue = useMemo(
    () => ({ refreshWorkspace }),
    [refreshWorkspace]
  );

  return (
    <WorkspaceProvider value={workspaceValue}>
      <div className="app-shell">
        <Sidebar
          open={sidebarOpen}
          close={() => setSidebarOpen(false)}
          businessName={businessName}
          ownerName={user?.name}
          requestCount={openRequestCount}
          onLogout={handleLogout}
        />

        <div className="app-main">
          <header className="topbar">
            <div className="topbar-left">
              <button
                className="icon-button menu-trigger"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open navigation"
              >
                <Menu size={21} />
              </button>
              <div className="breadcrumb">
                <span>Workspace</span>
                <ChevronRight size={14} />
                <strong>{activePage}</strong>
              </div>
            </div>
            <div className="topbar-actions">
              {searchOpen && (
                <div className="global-search-wrap" ref={searchWrapRef}>
                  <input
                    className="global-search-input"
                    autoFocus
                    value={globalSearch}
                    onChange={(event) => setGlobalSearch(event.target.value)}
                    placeholder="Search customers, jobs, invoices..."
                    aria-label="Search workspace"
                  />
                  {globalSearch.trim() && (
                    <div className="global-search-results" role="listbox">
                      {searchResults.length === 0 ? (
                        <p className="global-search-empty">No matches found.</p>
                      ) : (
                        searchResults.map((result) => (
                          <button
                            key={result.id}
                            type="button"
                            className="global-search-item"
                            role="option"
                            onClick={() => goToResult(result)}
                          >
                            <span className="global-search-type">{result.type}</span>
                            <strong>{result.label}</strong>
                            <span>{result.meta}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
              <button
                className={`icon-button topbar-icon ${searchOpen ? "topbar-icon-active" : ""}`}
                onClick={() => {
                  setSearchOpen(!searchOpen);
                  setGlobalSearch("");
                  setNotificationsOpen(false);
                }}
                aria-label="Toggle search"
              >
                <Search size={18} />
              </button>
              <div className="topbar-divider" />
              <div className="notification-wrap" ref={notificationWrapRef}>
                <button
                  className="icon-button topbar-icon notification-button"
                  onClick={() => {
                    setNotificationsOpen(!notificationsOpen);
                    setSearchOpen(false);
                  }}
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                  {visibleNotifications.length > 0 && <span />}
                </button>
                {notificationsOpen && (
                  <div className="notification-popover">
                    <div className="notification-popover-header">
                      <strong>Notifications</strong>
                      {visibleNotifications.length > 0 && (
                        <span>{visibleNotifications.length}</span>
                      )}
                    </div>
                    {visibleNotifications.length === 0 ? (
                      <p className="notification-empty">
                        You&apos;re all caught up. Unpaid invoices and unassigned
                        jobs show up here.
                      </p>
                    ) : (
                      <div className="notification-list">
                        {visibleNotifications.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="notification-item"
                            onClick={() => goToNotification(item)}
                          >
                            <strong>{item.title}</strong>
                            <span>{item.detail}</span>
                            {item.at && (
                              <em>{formatRelativeTime(item.at)}</em>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      className="notification-dismiss"
                      onClick={dismissAllNotifications}
                    >
                      {visibleNotifications.length > 0 ? "Dismiss all" : "Close"}
                    </button>
                  </div>
                )}
              </div>
              <div className="topbar-user">
                <div className="profile-avatar top-avatar">
                  {getInitials(user?.name)}
                </div>
              </div>
            </div>
          </header>

          {bootstrapError && (
            <div className="bootstrap-error">
              {bootstrapError}{" "}
              <button type="button" onClick={refreshWorkspace}>
                Retry
              </button>
            </div>
          )}

          <main className="page-content">
            <Routes>
              <Route
                index
                element={<OverviewDashboard onNavigate={navigate} />}
              />
              <Route path="service-requests" element={<ServiceRequestsPage />} />
              <Route path="services" element={<ServicesPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="team" element={<TeamPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="activity" element={<ActivityPage />} />
              <Route
                path="settings"
                element={
                  <SettingsPage
                    onBusinessUpdated={(name) => {
                      setBusinessName(name || "ServiceFlow Co.");
                      refreshWorkspace();
                    }}
                  />
                }
              />
              <Route path="help" element={<HelpPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </WorkspaceProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<OwnerLogin />} />
        <Route path="/register" element={<OwnerRegister />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute role="owner">
              <Onboarding />
            </ProtectedRoute>
          }
        />

        <Route path="/staff/login" element={<StaffLogin />} />
        <Route path="/staff" element={<StaffLayout />}>
          <Route index element={<Navigate to="tasks" replace />} />
          <Route path="tasks" element={<MyTasks />} />
          <Route path="schedule" element={<StaffSchedule />} />
          <Route path="profile" element={<StaffProfile />} />
        </Route>

        <Route
          path="/*"
          element={
            <ProtectedRoute role="owner" requireBusiness>
              <OwnerDashboardApp />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
