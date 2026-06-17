"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000") + "/api/v1";

export interface AuthUser {
  id: string;
  orcid_id: string;
  name: string;
  created_at: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
}

interface AuthContextValue extends AuthState {
  orcidLoginUrl: string;
  setSession: (token: string, user: AuthUser) => void;
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

  const setSession = useCallback((token: string, user: AuthUser) => {
    localStorage.setItem("oa_token", token);
    localStorage.setItem("oa_user", JSON.stringify(user));
    setState({ token, user });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("oa_token");
    localStorage.removeItem("oa_user");
    setState({ token: null, user: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, orcidLoginUrl: `${API}/auth/orcid/login`, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
