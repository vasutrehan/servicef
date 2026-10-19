import axios from "axios";
import { clearSession } from "./auth";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const path = window.location.pathname;
      const isAuthPage =
        path.startsWith("/login") ||
        path.startsWith("/register") ||
        path.startsWith("/staff/login");

      if (!isAuthPage) {
        clearSession();
        const redirect = path.startsWith("/staff")
          ? "/staff/login"
          : "/login";
        window.location.assign(redirect);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
