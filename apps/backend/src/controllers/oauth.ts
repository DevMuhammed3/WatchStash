import type { Request, Response } from 'express';
import type { OAuthProvider } from '@watchstash/types';
import { User, type IUser } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateState, verifyState, readState, generateCodeVerifier, generateCodeChallenge } from '../utils/oauthState.js';
import { issueTokens } from '../utils/issueTokens.js';
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
  let codeVerifier: string | undefined;
  let codeChallenge: string | undefined;

  if (config.pkce) {
    codeVerifier = generateCodeVerifier();
    codeChallenge = generateCodeChallenge(codeVerifier);
  }

  const state = generateState(provider, codeVerifier ? { codeVerifier } : undefined);
  res.redirect(buildAuthorizeUrl(provider as OAuthProvider, state, redirectUri, codeChallenge));
});

export const Callback = asyncHandler(async (req: Request, res: Response) => {
  const provider = req.params.provider as string;
  getOAuthProvider(provider);

  const { code, state } = req.query as { code?: string; state?: string };
  if (!code || !state || !verifyState(state, provider)) {
    throw new AppError('Invalid OAuth callback', 400);
  }

  const statePayload = readState(state, provider);
  const redirectUri = buildRedirectUri(req, provider);
  const profile = await exchangeCodeForProfile(
    provider as OAuthProvider,
    code,
    redirectUri,
    statePayload?.cv,
  );
  const user = await findOrCreateUserByOAuth(provider as OAuthProvider, profile);
  const { accessToken, refreshToken } = await issueTokens(user._id);

  const env = envValuaCheck.parse(process.env);
  const frontendOrigin = env.FRONTEND_ORIGIN.replace(/\/+$/, '');

  res.redirect(
    `${frontendOrigin}/auth/callback#access_token=${accessToken}&refresh_token=${refreshToken}`,
  );
});
