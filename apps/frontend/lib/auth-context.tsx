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
  getLegacyRefreshToken,
  clearLegacyRefreshToken,
  clearTokens,
} from "./auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: UserProfile | null;
  status: AuthStatus;
  logout: () => Promise<void>;
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  completeAuth: (accessToken: string, user?: UserProfile) => Promise<void>;
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
  const legacyRefreshToken = getLegacyRefreshToken();

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Carry the refresh cookie and accept the rotated Set-Cookie.
      credentials: "include",
      body: JSON.stringify(
        legacyRefreshToken ? { refreshToken: legacyRefreshToken } : {},
      ),
    });

    if (!res.ok) return false;

    const data = (await res.json()) as { accessToken?: string };
    if (!data.accessToken) return false;

    setAccessToken(data.accessToken);
    // The refresh token is now in the cookie; remove the localStorage copy.
    clearLegacyRefreshToken();
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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const hasLegacySession = Boolean(getLegacyRefreshToken());
      if (!getAccessToken() && !hasLegacySession) {
        setStatus("unauthenticated");
        return;
      }

      try {
        let accessToken = getAccessToken();

        if (!accessToken) {
          // A session without an access token: swap the legacy stored refresh
          // token for the cookie-backed one.
          if (!(await refreshOnce())) {
            clearTokens();
            if (!cancelled) {
              setUser(null);
              setStatus("unauthenticated");
            }
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
          if (!cancelled) {
            setUser(data.user);
            setStatus("authenticated");
          }
          return;
        }

        clearTokens();
        if (!cancelled) {
          setUser(null);
          setStatus("unauthenticated");
        }
      } catch {
        // Network failure, not a rejected session: keep the tokens so the
        // user is not signed out by a flaky connection, but stop showing the
        // loading state forever.
        if (!cancelled) {
          setUser(null);
          setStatus("unauthenticated");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
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
    const legacyRefreshToken = getLegacyRefreshToken();

    // Best effort: revoke the session and clear the cookie server-side. The
    // cookie rides along automatically; a legacy token rides in the body.
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(
        legacyRefreshToken ? { refreshToken: legacyRefreshToken } : {},
      ),
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

      if (res.status === 401 && accessToken && (await refreshOnce())) {
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
      }

      return res;
    },
    [],
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
