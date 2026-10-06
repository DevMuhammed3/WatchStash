import type { Request, Response, NextFunction } from 'express';

/**
 * CSRF guard for the auth POST routes.
 *
 * The refresh cookie is SameSite=None in production (the frontend and the API
 * live on different sites), so SameSite no longer stops a cross-site POST from
 * carrying it. Browsers are required to attach the Origin header to
 * cross-origin fetches, so rejecting unknown origins closes that hole.
 * Non-browser clients (tests, curl) send no Origin and are let through —
 * they cannot obtain the cookie in the first place.
 */
export function requireSameOrigin(req: Request, res: Response, next: NextFunction): void {
  const originHeader = req.headers.origin;
  if (!originHeader) {
    next();
    return;
  }

  const allowedOrigins = [process.env.CORS_ORIGIN, process.env.FRONTEND_ORIGIN]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.replace(/\/+$/, ''));

  const origin = originHeader.replace(/\/+$/, '');
  if (!allowedOrigins.includes(origin)) {
    // Fail closed when neither origin is configured: that is a misconfiguration
    // worth surfacing rather than an invitation to forge requests.
    res.status(403).json({
      status: 'error',
      message: 'Cross-origin request rejected',
    });
    return;
  }

  next();
}
