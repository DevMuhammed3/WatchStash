"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { UserProfile } from "@watchstash/types";
import {
  API_BASE_URL,
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from "./auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: UserProfile | null;
  status: AuthStatus;
  logout: () => Promise<void>;
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  completeAuth: (
    accessToken: string,
    refreshToken: string,
    user?: UserProfile,
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const refreshTokens = useCallback(async (): Promise<boolean> => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;

    const data = (await res.json()) as { accessToken: string; refreshToken: string };
    setTokens(data.accessToken, data.refreshToken);
    return true;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const accessToken = getAccessToken();
      if (!accessToken) {
        setStatus("unauthenticated");
        return;
      }

      const me = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (me.ok) {
        const data = (await me.json()) as { user: UserProfile };
        if (!cancelled) {
          setUser(data.user);
          setStatus("authenticated");
        }
        return;
      }

      if (me.status === 401 && (await refreshTokens())) {
        const retry = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${getAccessToken()}` },
        });
        if (retry.ok) {
          const data = (await retry.json()) as { user: UserProfile };
          if (!cancelled) {
            setUser(data.user);
            setStatus("authenticated");
          }
          return;
        }
      }

      clearTokens();
      if (!cancelled) {
        setUser(null);
        setStatus("unauthenticated");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshTokens]);

  const completeAuth = useCallback(
    async (accessToken: string, refreshToken: string, user?: UserProfile) => {
      setTokens(accessToken, refreshToken);

      if (user) {
        setUser(user);
        setStatus("authenticated");
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.ok) {
        const data = (await res.json()) as { user: UserProfile };
        setUser(data.user);
        setStatus("authenticated");
      } else {
        clearTokens();
        setStatus("unauthenticated");
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();

    if (accessToken && refreshToken) {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }

    clearTokens();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const apiFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const accessToken = getAccessToken();
      const headers = new Headers(init?.headers);
      if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
      }

      let res = await fetch(input, { ...init, headers });

      if (res.status === 401 && accessToken && (await refreshTokens())) {
        const retryHeaders = new Headers(init?.headers);
        const newToken = getAccessToken();
        if (newToken) {
          retryHeaders.set("Authorization", `Bearer ${newToken}`);
        }
        res = await fetch(input, { ...init, headers: retryHeaders });
      }

      return res;
    },
    [refreshTokens],
  );

  const value = useMemo(
    () => ({ user, status, logout, apiFetch, completeAuth }),
    [user, status, logout, apiFetch, completeAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
