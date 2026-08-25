import type { Request, Response } from 'express';
import type { OAuthProvider } from '@watchstash/types';
import { User, type IUser } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateState, diagnoseState, generateCodeVerifier, generateCodeChallenge } from '../utils/oauthState.js';
import logger from '../config/logger.js';
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

  logger.warn(
    `OAuth callback debug: provider=${provider} queryKeys=${JSON.stringify(Object.keys(req.query))} hasUrl=${Boolean(req.url)} urlLen=${req.url?.length}`,
  );
  {
    const desc = Object.getOwnPropertyDescriptor(req, 'query');
    logger.warn(
      `OAuth callback dbg2: ownProp=${desc ? (desc.get ? 'accessor' : 'data') : 'proto'} query=${JSON.stringify(req.query)} url=${req.url}`,
    );
  }

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

  const redirectUri = buildRedirectUri(req, provider);
  const profile = await exchangeCodeForProfile(
    provider as OAuthProvider,
    code,
    redirectUri,
    verdict.cv,
  );
  const user = await findOrCreateUserByOAuth(provider as OAuthProvider, profile);
  const { accessToken, refreshToken } = await issueTokens(user._id);

  const env = envValuaCheck.parse(process.env);
  const frontendOrigin = env.FRONTEND_ORIGIN.replace(/\/+$/, '');

  res.redirect(
    `${frontendOrigin}/auth/callback#access_token=${accessToken}&refresh_token=${refreshToken}`,
  );
});
