import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface User {
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; needsVerification?: boolean }>;
  logout: () => void;
  setAuth: (token: string, user: User) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("forensic_token");
      const storedUser = localStorage.getItem("forensic_auth_user");
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch {
      // Ignore malformed local auth state and start signed out.
    }
  }, []);

  const setAuth = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("forensic_token", newToken);
    localStorage.setItem("forensic_auth_user", JSON.stringify(newUser));
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          return { success: false, error: data.detail, needsVerification: true };
        }
        return { success: false, error: data.detail || "Login failed" };
      }
      setAuth(data.token, data.user);
      return { success: true };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    try {
      localStorage.removeItem("forensic_token");
      localStorage.removeItem("forensic_auth_user");
    } catch {}
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, setAuth, isAuthenticated: !!user && !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
