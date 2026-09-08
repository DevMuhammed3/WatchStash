import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except:
  // - /api — backend API
  // - /_next, /_vercel — framework internals
  // - anything with a file extension (favicon.ico, images, etc.)
  // - /auth — the OAuth callback must stay non-localized (the backend
  //   redirects there, and its hash fragment carries the tokens)
  matcher: ["/((?!api|_next|_vercel|auth|.*\\..*).*)"],
};