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
  setAccessToken,
  clearTokens,
} from "./auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

interface AuthContextValue {
  user: UserProfile | null;
  status: AuthStatus;
  logout: () => Promise<void>;
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  completeAuth: (accessToken: string, user?: UserProfile) => Promise<void>;
  retrySession: () => void;
  updateUser: (user: UserProfile) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Exchanges the refresh session for a new access token. The refresh token
 * itself lives in an httpOnly cookie, so nothing sensitive is read or written
 * by JavaScript here; the only legacy exception is a token still sitting in
 * localStorage from before the cookie, which is sent once in the body and
 * then dropped as soon as the cookie has been established.
 */
async function requestRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Carry the httpOnly refresh cookie and accept the rotated Set-Cookie.
      credentials: "include",
      body: JSON.stringify({}),
    });

    if (!res.ok) return false;

    const data = (await res.json()) as { accessToken?: string };
    if (!data.accessToken) return false;

    setAccessToken(data.accessToken);
    return true;
  } catch {
    // Network failure: report "could not refresh" instead of throwing, so a
    // flaky connection never leaves callers (or the boot sequence) hanging.
    return false;
  }
}

// Refresh tokens are single-use, so concurrent 401s must share one rotation:
// two parallel refreshes would revoke each other's replacement and sign the
// user out. Everyone awaits the same in-flight promise.
let refreshInFlight: Promise<boolean> | null = null;
function refreshOnce(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = requestRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function fetchMe(accessToken: string | null): Promise<Response> {
  return fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    credentials: "include",
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const restoreSession = useCallback(async () => {
    setStatus("loading");
    try {
      let accessToken = getAccessToken();

      if (!accessToken) {
        if (!(await refreshOnce())) {
          setUser(null);
          setStatus("unauthenticated");
          return;
        }
        accessToken = getAccessToken();
      }

      let me = await fetchMe(accessToken);

      if (me.status === 401 && (await refreshOnce())) {
        accessToken = getAccessToken();
        me = await fetchMe(accessToken);
      }

      if (me.ok) {
        const data = (await me.json()) as { user: UserProfile };
        setUser(data.user);
        setStatus("authenticated");
        return;
      }

      if (me.status === 401 || me.status === 403) {
        clearTokens();
        setUser(null);
        setStatus("unauthenticated");
        return;
      }

      setUser(null);
      setStatus("error");
    } catch {
      setUser(null);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const retrySession = useCallback(() => {
    void restoreSession();
  }, [restoreSession]);

  const updateUser = useCallback((nextUser: UserProfile) => {
    setUser(nextUser);
    setStatus("authenticated");
  }, []);

  const completeAuth = useCallback(
    async (accessToken: string, user?: UserProfile) => {
      setAccessToken(accessToken);

      if (user) {
        setUser(user);
        setStatus("authenticated");
        return;
      }

      try {
        const res = await fetchMe(accessToken);

        if (res.ok) {
          const data = (await res.json()) as { user: UserProfile };
          setUser(data.user);
          setStatus("authenticated");
        } else {
          clearTokens();
          setStatus("unauthenticated");
        }
      } catch {
        clearTokens();
        setStatus("unauthenticated");
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    // Best effort: revoke the session and clear the httpOnly cookie server-side.
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({}),
    }).catch(() => {});

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

      let res = await fetch(input, { ...init, headers, credentials: "include" });

      if (res.status === 401 && accessToken) {
        if (await refreshOnce()) {
          const retryHeaders = new Headers(init?.headers);
          const newToken = getAccessToken();
          if (newToken) {
            retryHeaders.set("Authorization", `Bearer ${newToken}`);
          }
          res = await fetch(input, {
            ...init,
            headers: retryHeaders,
            credentials: "include",
          });
        } else {
          clearTokens();
          setUser(null);
          setStatus("unauthenticated");
        }
      }

      return res;
    },
    [],
  );

  const value = useMemo(
    () => ({ user, status, logout, apiFetch, completeAuth, retrySession, updateUser }),
    [user, status, logout, apiFetch, completeAuth, retrySession, updateUser],
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
