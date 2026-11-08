import type { Request, Response } from 'express';
import type { OAuthProvider } from '@watchstash/types';
import { User, type IUser } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  generateState,
  generateNonce,
  diagnoseState,
  registerNonce,
  consumeNonce,
  generateCodeVerifier,
  generateCodeChallenge,
} from '../utils/oauthState.js';
import logger from '../config/logger.js';
import { issueTokens } from '../utils/issueTokens.js';
import { setRefreshCookie } from '../utils/refreshCookie.js';
import { findUniqueUsername } from '../utils/uniqueUsername.js';
import type { OAuthProfile } from '../config/oauth.js';
import {
  getOAuthProvider,
  providerIdKey,
  buildAuthorizeUrl,
  exchangeCodeForProfile,
} from '../config/oauth.js';
import envValuaCheck from '../config/env.js';

function buildRedirectUri(req: Request, provider: string): string {
  return `${req.protocol}://${req.get('host')}/api/auth/oauth/${provider}/callback`;
}

const PKCE_COOKIE_NAME = 'watchstash_oauth_pkce';
const PKCE_COOKIE_TTL_MS = 10 * 60 * 1000;

function pkceCookieOptions(provider: string) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: `/api/auth/oauth/${provider}/callback`,
  };
}

interface PkceCookie {
  /** Nonce this verifier belongs to, binding cookie and state. */
  n: string;
  /** PKCE code_verifier. */
  v: string;
}

function setPkceCookie(
  res: Response,
  provider: string,
  nonce: string,
  codeVerifier: string,
): void {
  const value: PkceCookie = { n: nonce, v: codeVerifier };
  res.cookie(PKCE_COOKIE_NAME, JSON.stringify(value), {
    ...pkceCookieOptions(provider),
    maxAge: PKCE_COOKIE_TTL_MS,
  });
}

function readPkceCookie(req: Request): PkceCookie | null {
  const raw = req.cookies?.[PKCE_COOKIE_NAME];
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw) as { n?: unknown; v?: unknown };
    if (typeof parsed.n === 'string' && typeof parsed.v === 'string') {
      return { n: parsed.n, v: parsed.v };
    }
  } catch {
    // Malformed cookie: treat it as absent.
  }
  return null;
}

function clearPkceCookie(res: Response, provider: string): void {
  res.clearCookie(PKCE_COOKIE_NAME, pkceCookieOptions(provider));
}

export async function findOrCreateUserByOAuth(
  provider: OAuthProvider,
  profile: OAuthProfile,
): Promise<IUser> {
  const providerField = providerIdKey(provider);

  const alreadyLinked = await User.findOne({ [`providers.${providerField}`]: profile.providerId });
  if (alreadyLinked) {
    return alreadyLinked;
  }

  if (profile.emailVerified) {
    const byEmail = await User.findOne({ email: profile.email.toLowerCase() });
    if (byEmail) {
      byEmail.set(`providers.${providerField}`, profile.providerId);
      await byEmail.save();
      return byEmail;
    }
  }

  const username = await findUniqueUsername(
    profile.displayName || profile.email.split('@')[0] || '',
  );
  return User.create({
    username,
    displayName: profile.displayName || username,
    email: profile.email.toLowerCase(),
    hasPassword: false,
    bio: '',
    avatarUrl: profile.avatarUrl,
    providers: { [providerField]: profile.providerId } as IUser['providers'],
  });
}

export const Authorize = asyncHandler(async (req: Request, res: Response) => {
  const provider = req.params.provider as string;
  const config = getOAuthProvider(provider);

  const redirectUri = buildRedirectUri(req, provider);
  const nonce = generateNonce();
  const state = generateState(provider, nonce);
  await registerNonce(nonce);

  let codeChallenge: string | undefined;
  if (config.pkce) {
    // The verifier never enters the state (which travels through the provider
    // and browser history). It lives in an httpOnly cookie scoped to this
    // provider's callback path.
    const codeVerifier = generateCodeVerifier();
    codeChallenge = generateCodeChallenge(codeVerifier);
    setPkceCookie(res, provider, nonce, codeVerifier);
  }

  res.redirect(buildAuthorizeUrl(provider as OAuthProvider, state, redirectUri, codeChallenge));
});

export const Callback = asyncHandler(async (req: Request, res: Response) => {
  const provider = req.params.provider as string;
  const config = getOAuthProvider(provider);

  const { code, state, error } = req.query as {
    code?: string;
    state?: string;
    error?: string;
  };

  if (error) {
    logger.warn(`OAuth aborted by provider: provider=${provider} error=${error}`);
    throw new AppError('OAuth sign-in was cancelled or failed. Please try again.', 400);
  }

  if (!code || !state) {
    logger.warn(`OAuth callback rejected: provider=${provider} reason=missing_params`);
    throw new AppError('Invalid OAuth callback (missing_params)', 400);
  }
  const verdict = diagnoseState(state, provider);
  if (!verdict.ok) {
    logger.warn(`OAuth callback rejected: provider=${provider} reason=${verdict.reason}`);
    throw new AppError(`Invalid OAuth callback (${verdict.reason})`, 400);
  }

  // For PKCE providers the verifier must come from the httpOnly cookie and
  // belong to this exact state (same nonce). A missing/mismatched cookie means
  // the state was not issued to this browser.
  let pkceCookie: PkceCookie | null = null;
  if (config.pkce) {
    pkceCookie = readPkceCookie(req);
    if (!pkceCookie || pkceCookie.n !== verdict.nonce) {
      clearPkceCookie(res, provider);
      logger.warn(`OAuth callback rejected: provider=${provider} reason=state_mismatch`);
      throw new AppError('Invalid OAuth callback (state_mismatch)', 400);
    }
  }

  // Single use: the first callback claims the nonce, every replay fails.
  if (!(await consumeNonce(verdict.nonce))) {
    clearPkceCookie(res, provider);
    logger.warn(`OAuth callback rejected: provider=${provider} reason=replayed_state`);
    throw new AppError('Invalid OAuth callback (replayed_state)', 400);
  }
  clearPkceCookie(res, provider);

  const redirectUri = buildRedirectUri(req, provider);
  const profile = await exchangeCodeForProfile(
    provider as OAuthProvider,
    code,
    redirectUri,
    pkceCookie?.v,
  );
  const user = await findOrCreateUserByOAuth(provider as OAuthProvider, profile);
  const { accessToken, refreshToken } = await issueTokens(user._id);

  const env = envValuaCheck.parse(process.env);
  const frontendOrigin = env.FRONTEND_ORIGIN.replace(/\/+$/, '');

  // Set the refresh cookie on the API origin before bouncing to the SPA; the
  // cookie is scoped to /api/auth so the browser only sends it back to us.
  setRefreshCookie(res, refreshToken);

  // Only the short-lived access token goes in the URL. The refresh token
  // deliberately does not: fragments end up in browser history, proxy logs
  // and Referer headers, and JavaScript must never be able to read it.
  res.redirect(`${frontendOrigin}/auth/callback#access_token=${accessToken}`);
});
