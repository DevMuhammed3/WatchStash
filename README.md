# WatchStash

WatchStash is a full-stack media tracking application for movies, TV series, and anime. Discover what is trending, add titles to a personal stash, track progress, rate and review what you watch, and manage your account from one place.

The project is a Bun monorepo with an Express/MongoDB API, a Next.js web app, and shared TypeScript and UI packages.

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment variables](#environment-variables)
- [Getting started](#getting-started)
- [Available scripts](#available-scripts)
- [Frontend routes](#frontend-routes)
- [API reference](#api-reference)
- [Authentication and sessions](#authentication-and-sessions)
- [Account settings](#account-settings)
- [Data model](#data-model)
- [Testing and quality checks](#testing-and-quality-checks)
- [Deployment](#deployment)
- [Current limitations](#current-limitations)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Features

### Discovery

- Trending titles from TMDB.
- Popular movies and popular TV shows.
- Search across movies and TV.
- Media detail view with poster, overview, year, genres, and TMDB rating.
- Add to stash from a search or trending result.

### Stash and tracker

- Personal stash with paginated reads.
- Status tracking: `plan_to_watch`, `watching`, `completed`, and `on_hold`.
- Ratings from 1 to 10.
- Reviews up to 5,000 characters.
- Episode and season progress for series and anime.
- Tags, poster/backdrop artwork, and cached TMDB metadata.
- Status-grouped sections, text search, and sorting by recency or rating.
- Editing and deleting stash entries.
- A separate lightweight movie collection (`/api/movies`) for simple watched/not-watched records.

### Accounts and authentication

- Email and username registration with password validation.
- Password login.
- OAuth sign-in with Google and GitHub. Backend wiring also exists for Facebook and X, but those buttons are marked "Coming soon" in the UI.
- Short-lived access tokens with rotating refresh sessions.
- Automatic OAuth account linking when the provider reports a verified email that matches an existing account.

### Account settings

Available at `/app/settings`:

- **Profile**: display name, username, bio, and avatar URL, with a live avatar preview. Email is shown read-only.
- **Security**: connected sign-in providers, set or change a password, and sign out all other sessions.
- **Danger zone**: permanently delete the account after typing the username to confirm.

### Marketing and legal

- Public landing page with a hero built from real TMDB artwork.
- Privacy and terms pages.
- SEO metadata, sitemap, and robots.txt.
- English localization through `next-intl`; the routing setup is ready for more locales.
- Mobile gate for viewports below 640px while the mobile experience is being built.

## Tech stack

| Layer | Technology |
| --- | --- |
| Runtime and package manager | Bun |
| Backend | Express 5, TypeScript |
| Database | MongoDB with Mongoose 8 |
| Validation | Zod 4 |
| Authentication | JWT access tokens, rotating refresh tokens in an httpOnly cookie, OAuth 2.0 |
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Localization | `next-intl` |
| Media data | TMDB |
| Rate limiting and cache | Upstash Redis (optional; in-memory fallback in development) |
| Logging | pino / pino-http |

## Project structure

```text
watchstash/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── config/        # Environment, database, JWT, OAuth, Redis, logging
│   │   │   ├── controllers/   # Request handlers
│   │   │   ├── middleware/    # Auth, validation, errors, CSRF, request IDs
│   │   │   ├── models/        # Mongoose models
│   │   │   ├── routes/        # Express routers
│   │   │   ├── services/      # TMDB provider and normalization
│   │   │   ├── utils/         # Tokens, cookies, errors, helpers
│   │   │   ├── validations/   # Zod request schemas
│   │   │   ├── __tests__/     # Bun test suites
│   │   │   ├── app.ts         # Express app factory
│   │   │   └── index.ts       # Server entrypoint
│   │   ├── .env.example
│   │   └── vercel.json
│   └── frontend/
│       ├── app/               # Next.js App Router pages
│       ├── components/        # UI, landing, media, settings, and auth components
│       ├── i18n/              # next-intl routing and request config
│       ├── lib/               # API client, auth context, shared helpers
│       ├── messages/          # Translation catalogs
│       └── .env.example
├── packages/
│   ├── types/                 # Shared TypeScript types
│   └── ui/                    # Shared React components (Button, Input, Dialog, etc.)
└── package.json               # Workspace scripts
```

## Prerequisites

- [Bun](https://bun.com) 1.3 or newer.
- A MongoDB instance (local or hosted, such as MongoDB Atlas).
- A TMDB account with an API read access token or v3 API key.
- Optional: an Upstash Redis database for distributed caching and rate limiting.
- Optional: OAuth apps for Google, GitHub, Facebook, and/or X.

## Environment variables

Copy the example files and fill in real values:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
```

Bun loads `.env` files automatically; no `dotenv` setup is required.

### Backend (`apps/backend/.env`)

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | API port. Defaults to `3001`. |
| `MONGODB_URI` | Yes | MongoDB connection string. |
| `JWT_SECRET` | Yes | Secret used to sign 15-minute access tokens. |
| `JWT_REFRESH_SECRET` | Yes | Secret used to sign 7-day refresh tokens. |
| `CORS_ORIGIN` | Yes | Allowed browser origin, for example `http://localhost:3000`. No trailing slash. |
| `FRONTEND_ORIGIN` | Yes | Frontend origin used for OAuth redirects and same-origin checks. No trailing slash. |
| `OAUTH_STATE_SECRET` | Yes | Secret used to sign and verify OAuth state values. |
| `TMDB_ACCESS_TOKEN` | For media | TMDB v4 read access token (Bearer auth). |
| `TMDB_API_KEY` | For media | TMDB v3 API key. Used when `TMDB_ACCESS_TOKEN` is unset. |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Redis REST URL for cache and rate limiting. |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis REST token. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | No | Google OAuth credentials. |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | No | GitHub OAuth credentials. |
| `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` | No | Facebook OAuth credentials. |
| `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET` | No | X (Twitter) OAuth 2.0 credentials; PKCE is used. |

Generate secrets with:

```bash
openssl rand -base64 32
```

OAuth apps must use this callback URL pattern, both locally and in production:

```text
http://localhost:3001/api/auth/oauth/<provider>/callback
https://<your-backend-domain>/api/auth/oauth/<provider>/callback
```

Supported provider keys: `google`, `github`, `facebook`, `twitter`.

### Frontend (`apps/frontend/.env.local`)

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Recommended | Backend base URL, for example `http://localhost:3001`. Defaults to that value if unset. Inlined at build time. |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Canonical frontend URL used by metadata, sitemap, and robots. Defaults to `https://watchstash.site`. Inlined at build time. |

Because `NEXT_PUBLIC_*` values are compiled into the browser bundle, set them in the hosting provider before building or deploying.

## Getting started

Install all workspace dependencies:

```bash
bun install
```

The root `postinstall` script builds `@watchstash/types` and links the shared packages.

Run the backend and frontend together:

```bash
bun run dev
```

- Frontend: <http://localhost:3000>
- Backend: <http://localhost:3001>
- Health check: <http://localhost:3001/health>

Or run them individually:

```bash
bun run dev:backend
bun run dev:frontend
```

The backend runs with `bun --watch`; the frontend uses the Next.js dev server.

## Available scripts

### Root

| Command | Description |
| --- | --- |
| `bun run dev` | Run backend and frontend concurrently. |
| `bun run dev:backend` | Run the API with watch mode. |
| `bun run dev:frontend` | Run the Next.js dev server. |

### Backend (`apps/backend`)

| Command | Description |
| --- | --- |
| `bun run dev` | Start the API with watch mode. |
| `bun run start` | Start the API without watch mode. |
| `bun run build` | Type-check and compile with TypeScript. |
| `bun test` | Run all backend tests. |
| `bun run lint` | Run ESLint. |
| `bun run lint:fix` | Run ESLint with automatic fixes. |
| `bun run format` | Format source with Prettier. |
| `bun run format:check` | Check formatting. |

### Frontend (`apps/frontend`)

| Command | Description |
| --- | --- |
| `bun run dev` | Start the Next.js dev server. |
| `bun run build` | Create a production build. |
| `bun run start` | Serve the production build. |
| `bun run lint` | Run Next.js linting. |
| `bun run typecheck` | Run `tsc --noEmit`. |

## Frontend routes

| Route | Purpose |
| --- | --- |
| `/` | Public landing page with a live TMDB showcase. |
| `/login` | Sign in or create an account; OAuth buttons. |
| `/app` | Authenticated discovery page: trending, popular movies, popular TV, search, and add-to-stash. |
| `/app/tracker` | Personal stash with status filters, sorting, editing, and deletion. |
| `/app/settings` | Profile, security, and account deletion. |
| `/auth/callback` | Reads the access token from the OAuth redirect fragment and opens the app. |
| `/privacy` | Privacy policy. |
| `/terms` | Terms of service. |

The default locale (`en`) uses unprefixed URLs. Protected routes are wrapped by `RouteGuard`, which redirects unauthenticated visitors to `/login` and authenticated visitors away from guest-only pages.

## API reference

Base URL: `http://localhost:3001`

All responses follow this shape:

```json
{ "status": "success", "...": "endpoint-specific fields" }
```

Errors return an HTTP error status and:

```json
{ "status": "error", "message": "Human-readable description" }
```

Authenticated endpoints expect:

```http
Authorization: Bearer <accessToken>
```

State-changing auth endpoints also enforce a same-origin `Origin` header when one is present. Requests from tests or `curl` without an `Origin` header are allowed because they cannot receive the browser's refresh cookie.

### Health

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/` | No | Returns `WatchStash API is up and running!`. |
| `GET` | `/health` | No | Returns service and MongoDB connection status. |

### Authentication

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | No | Create an account and start a session. |
| `POST` | `/api/auth/login` | No | Sign in with email or username and password. |
| `POST` | `/api/auth/refresh` | Refresh cookie | Rotate the refresh token and issue a new access token. |
| `POST` | `/api/auth/logout` | Refresh cookie | Revoke the current refresh token and clear the cookie. |
| `GET` | `/api/auth/me` | Bearer | Return the current user profile. |
| `PATCH` | `/api/auth/me` | Bearer | Update profile fields. |
| `DELETE` | `/api/auth/me` | Bearer | Delete the account after username confirmation. |
| `POST` | `/api/auth/change-password` | Bearer | Set or change the account password. |
| `POST` | `/api/auth/logout-others` | Bearer | Revoke every other refresh session. |
| `GET` | `/api/auth/oauth/:provider/authorize` | No | Redirect to the provider's consent screen. |
| `GET` | `/api/auth/oauth/:provider/callback` | No | Exchange the provider code and redirect to the frontend. |

#### Register

```json
{
  "username": "ada_lovelace",
  "displayName": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "Password1"
}
```

Rules: username is 3–30 lowercase letters, numbers, or underscores; display name is 1–50 characters; password is 8–100 characters with at least one uppercase letter, one lowercase letter, and one number.

Response `201`:

```json
{
  "status": "success",
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>",
  "user": {
    "_id": "...",
    "username": "ada_lovelace",
    "displayName": "Ada Lovelace",
    "email": "ada@example.com",
    "bio": "",
    "avatarUrl": "",
    "hasPassword": true,
    "providers": {
      "google": false,
      "github": false,
      "facebook": false,
      "twitter": false
    }
  }
}
```

The refresh token is also set as an httpOnly cookie. The body copy exists for legacy clients; browser clients should rely on the cookie.

#### Login

```json
{ "identifier": "ada@example.com", "password": "Password1" }
```

`identifier` accepts either email or username. A successful login revokes the account's previous refresh tokens and starts a fresh session.

#### Refresh and logout

These endpoints read the refresh token from the `watchstash_refresh` cookie. A `refreshToken` body field is supported as a legacy fallback.

- Refresh rotates the token. The old token remains usable for a short grace window to tolerate double-submitted requests.
- Logout revokes the token and clears the cookie.

### Media (TMDB proxy)

All routes except `/showcase` require a bearer token.

| Method | Path | Query | Description |
| --- | --- | --- | --- |
| `GET` | `/api/media/showcase` | None | Public, cached selection of up to six trending titles with posters. |
| `GET` | `/api/media/search` | `query`, `page` | Search movies and TV. |
| `GET` | `/api/media/trending` | `page` | Trending titles for the week. |
| `GET` | `/api/media/popular` | `mediaType=movie\|tv`, `page` | Popular titles by media type. |
| `GET` | `/api/media/details/:provider/:id` | `mediaType=movie\|tv` (optional) | Full details for one title. `provider` is currently `tmdb`. |

Pages start at 1. The media response includes `page`, `totalPages`, `totalResults`, and normalized `results`.

### Stash

All routes require a bearer token.

| Method | Path | Query / body | Description |
| --- | --- | --- | --- |
| `GET` | `/api/stash` | `page`, `limit` | List the user's stash. `limit` defaults to 50 and is capped at 100. |
| `POST` | `/api/stash/from-provider` | See below | Add a TMDB title to the stash. |
| `PATCH` | `/api/stash/:id` | Partial update | Update status, rating, review, tags, or progress. |
| `DELETE` | `/api/stash/:id` | None | Delete a stash item. |

Add-from-provider body:

```json
{
  "provider": "tmdb",
  "externalId": "693134",
  "type": "movie",
  "status": "plan_to_watch",
  "rating": 8,
  "review": "Looking forward to this.",
  "tags": ["sci-fi"],
  "progress": {
    "currentEpisode": 0,
    "totalEpisodes": 12,
    "currentSeason": 1
  }
}
```

- `type`: `movie`, `series`, or `anime`.
- `status`: `plan_to_watch`, `watching`, `completed`, or `on_hold`.
- `rating`: integer from 1 to 10.
- `review`: up to 5,000 characters.
- `tags`: up to 50 tags, each up to 50 characters.

### Movies

A simpler movie collection, separate from the stash, for basic title and watched-state tracking. All routes require a bearer token.

| Method | Path | Body | Description |
| --- | --- | --- | --- |
| `POST` | `/api/movies` | `title`, optional `description`, `releaseYear`, `genre`, `watched` | Create a movie. |
| `GET` | `/api/movies` | None | List the user's movies. |
| `PATCH` | `/api/movies/:id/toggle-watched` | None | Toggle the watched flag. |
| `DELETE` | `/api/movies/:id` | None | Delete a movie. |

### User profile shape

`GET /api/auth/me` and the settings endpoints return this user shape:

```json
{
  "_id": "...",
  "username": "ada_lovelace",
  "displayName": "Ada Lovelace",
  "email": "ada@example.com",
  "bio": "Watching one episode at a time.",
  "avatarUrl": "https://example.com/avatar.png",
  "hasPassword": true,
  "providers": {
    "google": false,
    "github": true,
    "facebook": false,
    "twitter": false
  }
}
```

Provider IDs and the password hash are never exposed. `hasPassword` reflects whether the account has a usable password, including accounts created before the flag was added.

### Updating the profile

```http
PATCH /api/auth/me
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "displayName": "Ada L.",
  "username": "ada_l",
  "bio": "Mathematician. Occasional viewer.",
  "avatarUrl": "https://example.com/ada.png"
}
```

All fields are optional, but at least one is required. Email cannot be changed through this endpoint. `avatarUrl` must be empty or start with `http://` or `https://`.

### Changing or setting a password

```http
POST /api/auth/change-password
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "currentPassword": "Password1",
  "newPassword": "Password2"
}
```

- Accounts with an existing password must provide the correct `currentPassword`.
- OAuth-only accounts may omit `currentPassword` and set one directly.
- A successful change revokes every other refresh session while keeping the current browser signed in.
- The response includes the updated user profile so the UI can switch from "Set password" to "Change password" immediately.

### Signing out other sessions

```http
POST /api/auth/logout-others
Authorization: Bearer <accessToken>
```

Marks all refresh tokens for the user as revoked except the current one. The response includes the number of revoked sessions.

### Deleting the account

```http
DELETE /api/auth/me
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "username": "ada_l" }
```

The username must match the account (case-insensitive) and is required as a deliberate confirmation step. Deletion cascades:

- stash items, including ratings, reviews, and progress;
- legacy movie records;
- refresh tokens;
- follow relationships in both directions.

The refresh cookie is cleared, and subsequent authenticated requests fail because the user no longer exists.

## Authentication and sessions

- **Access token**: JWT, 15-minute lifetime, kept in memory by the frontend. It is never written to `localStorage`.
- **Refresh token**: JWT, 7-day lifetime, delivered in the `watchstash_refresh` httpOnly cookie scoped to `/api/auth`.
- **Rotation**: every refresh issues a new token and revokes the old one. A 10-second grace window handles double-submitted rotations.
- **Cookie settings**: `SameSite=Lax` in development, `SameSite=None; Secure` in production because the frontend and API may be on different sites.
- **CSRF protection**: state-changing auth routes reject unknown `Origin` headers when present. CORS is restricted to `CORS_ORIGIN`.
- **Password storage**: bcrypt with 12 rounds.
- **OAuth linking**: if a provider returns a verified email matching an existing account, the provider is linked to that account. Otherwise a new account is created with a unique username.
- **OAuth redirect**: only the short-lived access token is placed in the frontend URL fragment. The refresh token is set as a cookie on the API origin before the redirect.

### Rate limiting

In production, when Upstash Redis is configured:

| Scope | Limit |
| --- | --- |
| Global per IP | 100 requests / 15 minutes |
| Auth endpoints per IP | 20 requests / 15 minutes |
| Media reads per user | 100 requests / 15 minutes |
| Public showcase per IP | 60 requests / 15 minutes |
| Stash reads/writes per user | 100 requests / 15 minutes |

Without Upstash credentials the backend uses an in-memory cache and disables distributed rate limiting. This is suitable for local development only.

## Account settings

The settings page lives at `/{locale}/app/settings` (`/app/settings` for English) and is linked from the account menu.

### Profile

- Editable: display name (1–50 characters), username (3–30 lowercase letters, numbers, underscores), bio (up to 500 characters), avatar URL (empty or `http(s)://`).
- Read-only: email.
- Avatar selection is URL-based. File uploads and image storage are not implemented.
- Changing the username checks uniqueness and returns `409` if it is already taken.

### Security

- Shows whether Google, GitHub, Facebook, and X are connected. Only booleans are exposed.
- Password state is derived from the stored hash, so older accounts are handled correctly.
- Password changes sign out other sessions but preserve the current one.
- "Sign out other sessions" is available even when no password is set.

### Danger zone

- Requires typing the exact username (case-insensitive) in a confirmation dialog.
- Deletes the account and all associated data.
- Clears the refresh cookie and returns the visitor to the landing page.

### Validation and error behavior

- Field validation is enforced by Zod on the backend and mirrored in the forms for immediate feedback.
- Duplicate usernames return `409`.
- Incorrect current passwords return `401`.
- Missing or malformed fields return `400`.
- Deleted or missing accounts return `404` for `/api/auth/me`.

## Data model

| Model | Key fields | Notes |
| --- | --- | --- |
| `User` | `username`, `displayName`, `email`, `passwordHash?`, `hasPassword`, `bio`, `avatarUrl`, `providers.*Id`, `followersCount`, `followingCount` | Unique lowercase username and email. OAuth-only users have no `passwordHash`. |
| `StashItem` | `userId`, `title`, `type`, `status`, `rating?`, `review?`, `progress`, `posterUrl?`, `provider?`, `externalId?`, TMDB metadata, `tags?` | Indexed by user; the main tracker record. |
| `Movie` | `userId`, `title`, `description`, `releaseYear`, `genre`, `watched` | Simple legacy movie collection. |
| `RefreshToken` | hashed `token`, `user`, `expiresAt`, `revoked`, `rotatedAt?`, `replacedBy?` | Automatic TTL cleanup at expiry. |
| `Follow` | `follower`, `following` | Unique pair; cleaned up when either account is deleted. |

Account deletion uses the `User` document's `deleteOne` middleware to cascade the related collections before removing the user.

## Testing and quality checks

Backend tests use Bun's built-in runner and Supertest:

```bash
cd apps/backend
bun test
```

Run a single suite:

```bash
cd apps/backend
bun test src/__tests__/authSettings.test.ts
```

Existing suites cover the app factory, auth HTTP flows, account settings, OAuth, the database layer, the media provider, Upstash behavior, and the Vercel entrypoint.

Test suites that delete documents derive a separate `watchstash_test` database from `MONGODB_URI`. Set `MONGODB_TEST_URI` to use a different scratch database. Never point destructive tests at the development database.

Type-check the projects:

```bash
cd apps/backend && bun x tsc --noEmit
cd apps/frontend && bun run typecheck
```

Lint and format the backend:

```bash
cd apps/backend
bun run lint
bun run format:check
```

## Deployment

### Frontend

The frontend is designed for Vercel or any Next.js host.

1. Set `NEXT_PUBLIC_API_URL` to the public backend URL.
2. Set `NEXT_PUBLIC_SITE_URL` to the canonical frontend URL.
3. Build before deploying; `NEXT_PUBLIC_*` values are inlined at build time.
4. Add the frontend domain to the backend's `CORS_ORIGIN` and `FRONTEND_ORIGIN`.

### Backend

The API can run on any host that supports Bun or Node.js. It also includes `apps/backend/vercel.json` for Vercel deployments.

Required production configuration:

- `MONGODB_URI` pointing to a reachable hosted database.
- Strong, separate `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `OAUTH_STATE_SECRET` values.
- `NODE_ENV=production` so the refresh cookie is marked `Secure` and `SameSite=None`.
- `CORS_ORIGIN` and `FRONTEND_ORIGIN` set to the deployed frontend origin, without trailing slashes.
- OAuth callback URLs registered as `https://<backend-domain>/api/auth/oauth/<provider>/callback`.
- Upstash credentials for reliable rate limiting and shared caching across serverless instances.

If the API and frontend share a site in production, adjust the cookie strategy in `apps/backend/src/utils/refreshCookie.ts` and the origin checks in `apps/backend/src/middleware/requireSameOrigin.ts` together.

## Current limitations

- Email addresses cannot be changed, and there is no email verification or password-reset flow yet.
- Avatars are URL-only; there is no upload or media storage.
- Facebook and X sign-in are wired on the backend but marked "Coming soon" in the UI.
- The site intentionally blocks viewports below 640px with a mobile gate.
- Only English is enabled in `next-intl`; the routing supports adding more locales.
- The simple `/api/movies` collection is separate from the richer stash tracker.

## Troubleshooting

### Backend exits on startup

Check that `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `FRONTEND_ORIGIN`, and `OAUTH_STATE_SECRET` are set. Environment validation fails fast when a required value is missing or malformed.

### MongoDB connection errors

- Confirm the database is running and reachable from the backend host.
- For Atlas, allow the server's IP address and use the SRV connection string.
- The API reports connection state at `GET /health`.

### Media endpoints return a configuration error

Set either `TMDB_ACCESS_TOKEN` (v4 read token, preferred) or `TMDB_API_KEY` (v3 key). The app still starts without one, but media features cannot load data.

### OAuth says a provider is not configured

Add the matching `*_CLIENT_ID` and `*_CLIENT_SECRET` pair, and register the exact callback URL shown in [Environment variables](#environment-variables). Restart the backend after changing environment values.

### CORS or "Cross-origin request rejected"

`CORS_ORIGIN` and `FRONTEND_ORIGIN` must exactly match the browser origin, including scheme and port, with no trailing slash. In production, both should use HTTPS.

### Login succeeds but the session disappears

The refresh cookie only works when the frontend and API are configured as expected:

- Development: use `http://localhost` for both.
- Production: set `NODE_ENV=production`, serve both over HTTPS, and keep `FRONTEND_ORIGIN` accurate.
- A cookie scoped to `/api/auth` is not sent to other paths; that is intentional.

### Rate limits or cache warnings

Add Upstash credentials for production. Without them, the backend logs a warning and falls back to an in-memory cache with rate limiting disabled.

## License

MIT
