import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { loginApi, type loginData } from "../api/loginAPi/login";
import { decodeJwtPayload, isTokenExpired } from "../helper/decrypt";

// Define the shape of the user data (from the token)
interface AuthPayload {
  user_id: number;
  username: string;
  userType: string;
}

// Define the shape of the context
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  payload: AuthPayload | null;
  login: (loginData: loginData) => Promise<void>;
  logout: () => void;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create the "Provider" component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [payload, setPayload] = useState<AuthPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start in loading state
  const navigate = useNavigate();

  // This effect runs ONCE when the app loads
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const accessToken = localStorage.getItem("accessToken");
        const refreshToken = localStorage.getItem("refreshToken");

        if (!accessToken && !refreshToken) {
          setIsAuthenticated(false);
          setPayload(null);
          return;
        }

        // 1. If access token is still valid, authenticate immediately
        if (accessToken && !isTokenExpired(accessToken)) {
          const { payload } = decodeJwtPayload(accessToken);
          if (payload) {
            setIsAuthenticated(true);
            setPayload(payload as AuthPayload);
            return;
          }
        }

        // 2. If access token is expired, check if refresh token is valid
        if (refreshToken && !isTokenExpired(refreshToken)) {
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
            const { payload } = decodeJwtPayload(newAccessToken);
            if (payload) {
              setIsAuthenticated(true);
              setPayload(payload as AuthPayload);
              return;
            }
          } catch (refreshErr) {
            console.error("Auto refresh on startup failed:", refreshErr);
          }
        }

        // 3. If neither token is valid, wipe credentials cleanly
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        localStorage.removeItem("sidebar_collapsed");
        setIsAuthenticated(false);
        setPayload(null);
      } catch (error) {
        console.error("Auth check failed", error);
        setIsAuthenticated(false);
        setPayload(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for changes in other tabs
    window.addEventListener("storage", checkAuth);
    return () => window.removeEventListener("storage", checkAuth);
  }, []);

  // Create the LOGIN function
  const login = async (loginData: loginData) => {
    const response = await loginApi(loginData); // Throws error on failure
    const accessToken = response.access;
    const refreshToken = response.refresh;
    if (accessToken && refreshToken) {
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(response.user));
      const { payload } = decodeJwtPayload();
      setIsAuthenticated(true);
      setPayload(payload as AuthPayload);
      window.dispatchEvent(new Event("storage")); // Trigger sync
      navigate("/dashboard");
    } else {
      throw new Error("Login failed: No token received.");
    }
  };

  // Create the LOGOUT function
  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("sidebar_collapsed");
    setIsAuthenticated(false);
    setPayload(null);
    window.dispatchEvent(new Event("storage")); // Trigger sync
    navigate("/login"); // Redirect to login
  };

  // Provide all values to children
  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, payload, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Create a custom hook to easily use the context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
