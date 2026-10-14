// Access tokens are short-lived and kept in memory only, so XSS that runs
// after a page load cannot steal a persisted credential. The refresh token
// travels in an httpOnly cookie and is never read by JavaScript.
let inMemoryAccessToken: string | null = null;

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setAccessToken(accessToken: string) {
  inMemoryAccessToken = accessToken;
}

/** No-op kept for compatibility: refresh tokens now live only in an httpOnly cookie. */
export function getLegacyRefreshToken(): string | null {
  return null;
}

/** No-op kept for compatibility. */
export function clearLegacyRefreshToken() {}

export function clearTokens() {
  inMemoryAccessToken = null;
}

export function oauthAuthorizeUrl(provider: "google" | "github" | "facebook" | "twitter"): string {
  return `${API_BASE_URL}/api/auth/oauth/${provider}/authorize`;
}