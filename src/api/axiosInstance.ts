import axios from "axios";
import { toast } from "react-toastify";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
});

// Helper to clear credentials and redirect to login
const handleLogout = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  localStorage.removeItem("sidebar_collapsed");
  window.dispatchEvent(new Event("storage"));

  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
};

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 1. Request Interceptor (Adds token)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 2. Response Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }
    if (!error.response) {
      if (error.code === "ECONNABORTED") {
        toast.error("Connection timed out. Backend is not responding.", {
          toastId: "backend-timeout",
        });
      } else {
        toast.error("Cannot connect to server. Is the Backend running?", {
          toastId: "backend-unreachable",
        });
      }
      return Promise.reject(error);
    }

    const isLoginRequest = originalRequest?.url?.includes("login/");

    // Check if error is genuine token expiration (401 OR 403 with "Token expired")
    const responseDataStr = JSON.stringify(error.response.data || "").toLowerCase();
    const isTokenExpired =
      error.response.status === 401 ||
      (error.response.status === 403 && responseDataStr.includes("token expired"));

    // Handle token expiration -> Refresh or Redirect to /login
    if (!isLoginRequest && isTokenExpired) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        isRefreshing = false;
        handleLogout();
        return Promise.reject(error);
      }

      try {
        const refreshResponse = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}refresh/`,
          { refresh: refreshToken }
        );
        const newAccessToken = refreshResponse.data.access;

        localStorage.setItem("accessToken", newAccessToken);
        if (refreshResponse.data.refresh) {
          localStorage.setItem("refreshToken", refreshResponse.data.refresh);
        }

        api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (axios.isAxiosError(refreshError)) {
          console.error(
            "Refresh API failed:",
            refreshError.response?.data || refreshError.message
          );
        } else {
          console.error("An unexpected error occurred during refresh:", refreshError);
        }

        handleLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle genuine 403 Forbidden (Only permission errors, NOT token expired)
    if (!isLoginRequest && error.response.status === 403 && !isTokenExpired) {
      toast.error(
        error.response?.data?.detail || "You do not have permission to access this resource.",
        { toastId: "permission-denied" }
      );
    }

    return Promise.reject(error);
  }
);

export default api;