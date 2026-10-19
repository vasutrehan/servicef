import { NavLink, Outlet, Navigate } from "react-router-dom";
import {
  ClipboardList,
  CalendarDays,
  UserRound,
  Wrench,
} from "lucide-react";
import { getStoredUser, getToken } from "../lib/auth";

const navigation = [
  { name: "Tasks", path: "/staff/tasks", icon: ClipboardList },
  { name: "Schedule", path: "/staff/schedule", icon: CalendarDays },
  { name: "Profile", path: "/staff/profile", icon: UserRound },
];

export default function StaffLayout() {
  const token = getToken();
  const user = getStoredUser();

  if (!token || !user || user.role !== "staff") {
    return <Navigate to="/staff/login" replace />;
  }

  return (
    <div className="staff-layout">
      <header className="staff-header">
        <div className="staff-brand">
          <div className="staff-brand-icon">
            <Wrench size={20} />
          </div>
          <span>
            serviceflow<span className="staff-brand-dot">.</span>
          </span>
        </div>

        <span className="staff-role">STAFF</span>
      </header>

      <main className="staff-main">
        <Outlet />
      </main>

      <nav className="staff-bottom-nav">
        {navigation.map(({ name, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `staff-nav-item ${isActive ? "active" : ""}`
            }
          >
            <Icon size={21} strokeWidth={1.8} />
            <span>{name}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
