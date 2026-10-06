const ACCESS_TOKEN_KEY = "watchstash_access_token";
// Legacy home of the refresh token. It now lives in an httpOnly cookie scoped
// to /api/auth, so this key only remains to swap existing sessions over to
// the cookie without logging anyone out.
const LEGACY_REFRESH_TOKEN_KEY = "watchstash_refresh_token";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(accessToken: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

/** @deprecated Refresh token now travels in an httpOnly cookie. */
export function getLegacyRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LEGACY_REFRESH_TOKEN_KEY);
}

export function clearLegacyRefreshToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
}

export function oauthAuthorizeUrl(provider: "google" | "github" | "facebook" | "twitter"): string {
  return `${API_BASE_URL}/api/auth/oauth/${provider}/authorize`;
}
