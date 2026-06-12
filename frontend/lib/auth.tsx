"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000") + "/api/v1";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, token: null });

  useEffect(() => {
    const token = localStorage.getItem("oa_token");
    const userRaw = localStorage.getItem("oa_user");
    if (token && userRaw) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      try { setState({ token, user: JSON.parse(userRaw) }); } catch {}
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ?? "Login failed");
    }
    const data = await res.json();
    localStorage.setItem("oa_token", data.access_token);
    localStorage.setItem("oa_user", JSON.stringify(data.user));
    setState({ token: data.access_token, user: data.user });
  }, []);

  const register = useCallback(async (email: string, name: string, password: string) => {
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ?? "Registration failed");
    }
    const data = await res.json();
    localStorage.setItem("oa_token", data.access_token);
    localStorage.setItem("oa_user", JSON.stringify(data.user));
    setState({ token: data.access_token, user: data.user });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("oa_token");
    localStorage.removeItem("oa_user");
    setState({ token: null, user: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
