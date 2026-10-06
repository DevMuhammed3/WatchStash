import type { Request, Response } from 'express';
import { REFRESH_TOKEN_EXPIRY_DAYS } from '../config/jwt.js';

/**
 * The refresh token is delivered as an httpOnly cookie so that JavaScript
 * (including anything injected by XSS) can never read it. The cookie is
 * scoped to `/api/auth` so it is only attached to the endpoints that need
 * it (refresh, logout, OAuth callback).
 */
export const REFRESH_COOKIE_NAME = 'watchstash_refresh';
const REFRESH_COOKIE_PATH = '/api/auth';

function isSecure(): boolean {
  // Browsers refuse `Secure` cookies on plain-HTTP origins, which rules out
  // http://localhost development.
  return process.env.NODE_ENV === 'production';
}

function sameSite(): 'lax' | 'none' {
  // In production the frontend (watchstash.site) and the API (*.vercel.app)
  // are different sites, so the cookie must be SameSite=None. That disables
  // SameSite as a CSRF defence, which is why `requireSameOrigin` guards the
  // auth POST routes. On localhost both apps share one site, so Lax is enough.
  return process.env.NODE_ENV === 'production' ? 'none' : 'lax';
}

function cookieOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax' | 'none';
  path: string;
} {
  return {
    httpOnly: true,
    secure: isSecure(),
    sameSite: sameSite(),
    path: REFRESH_COOKIE_PATH,
  };
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...cookieOptions(),
    maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions());
}

/**
 * Refresh token for the current request: httpOnly cookie first, request body
 * as a fallback. The body fallback exists so sessions that still keep the
 * token in localStorage can migrate to the cookie without being logged out.
 */
export function readRefreshToken(req: Request): string | null {
  const fromCookie = req.cookies?.[REFRESH_COOKIE_NAME];
  if (typeof fromCookie === 'string' && fromCookie.length > 0) {
    return fromCookie;
  }

  const fromBody = req.body?.refreshToken;
  if (typeof fromBody === 'string' && fromBody.length > 0) {
    return fromBody;
  }

  return null;
}

/** True when the caller supplied the token in the request body (legacy flow). */
export function refreshTokenFromBody(req: Request): boolean {
  const fromBody = req.body?.refreshToken;
  return typeof fromBody === 'string' && fromBody.length > 0;
}
