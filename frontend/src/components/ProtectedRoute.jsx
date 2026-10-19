import { Navigate, useLocation } from "react-router-dom";
import { getStoredUser, getToken } from "../lib/auth";

export default function ProtectedRoute({
  children,
  role,
  requireBusiness = false,
}) {
  const location = useLocation();
  const token = getToken();
  const user = getStoredUser();

  if (!token || !user) {
    const loginPath = role === "staff" ? "/staff/login" : "/login";
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  if (role && user.role !== role) {
    const redirect = user.role === "staff" ? "/staff/tasks" : "/";
    return <Navigate to={redirect} replace />;
  }

  if (requireBusiness && role === "owner" && !user.businessId) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
