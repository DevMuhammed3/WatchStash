import type { OAuthProvider, OAuthProviderIdKey } from '@watchstash/types';
import { AppError } from '../utils/AppError';

export interface OAuthProfile {
  providerId: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  avatarUrl: string;
}

export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  pkce?: boolean;
  fetchProfile: (accessToken: string) => Promise<OAuthProfile>;
}

function assertConfigured(config: OAuthProviderConfig, provider: OAuthProvider) {
  if (!config.clientId || !config.clientSecret) {
    throw new AppError(
      `${provider} OAuth is not configured. Set ${provider.toUpperCase()}_CLIENT_ID and ${provider.toUpperCase()}_CLIENT_SECRET`,
      500,
      false,
    );
  }
}

async function exchangeCode(
  config: OAuthProviderConfig,
  code: string,
  redirectUri: string,
  codeVerifier?: string,
): Promise<string> {
  const body: Record<string, string> = {
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  };

  if (codeVerifier) {
    body.code_verifier = codeVerifier;
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: new URLSearchParams(body),
  });

  const data = (await response.json()) as { access_token?: string; error?: string };
  if (!response.ok || !data.access_token) {
    throw new AppError('Failed to exchange OAuth code', 400);
  }
  return data.access_token;
}

async function fetchJson(url: string, headers: Record<string, string>): Promise<unknown> {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new AppError('Failed to fetch OAuth profile', 400);
  }
  return (await response.json()) as unknown;
}

function string(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

const google: OAuthProviderConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  scope: 'openid email profile',
  async fetchProfile(accessToken) {
    const profile = (await fetchJson('https://www.googleapis.com/oauth2/v3/userinfo', {
      Authorization: `Bearer ${accessToken}`,
    })) as {
      sub?: string;
      email?: string;
      email_verified?: unknown;
      name?: string;
      picture?: string;
    };
    return {
      providerId: string(profile.sub),
      email: string(profile.email),
      emailVerified: profile.email_verified === true || profile.email_verified === 'true',
      displayName: string(profile.name),
      avatarUrl: string(profile.picture),
    };
  },
};

const github: OAuthProviderConfig = {
  clientId: process.env.GITHUB_CLIENT_ID || '',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  authorizeUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  scope: 'read:user user:email',
  async fetchProfile(accessToken) {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'watchstash',
      Accept: 'application/vnd.github+json',
    };

    const profile = (await fetchJson('https://api.github.com/user', headers)) as {
      id?: number;
      login?: string;
      name?: string;
      avatar_url?: string;
      email?: string;
      email_verified?: unknown;
    };

    const emails = (await fetchJson('https://api.github.com/user/emails', headers)) as Array<{
      email: string;
      primary: boolean;
      verified: boolean;
    }>;

    const primary = Array.isArray(emails) ? emails.find((e) => e.primary && e.verified) : undefined;

    return {
      providerId: string(profile.id),
      email: primary?.email ?? string(profile.email),
      emailVerified: Boolean(primary?.verified) || profile.email_verified === true,
      displayName: string(profile.name || profile.login),
      avatarUrl: string(profile.avatar_url),
    };
  },
};

const facebook: OAuthProviderConfig = {
  clientId: process.env.FACEBOOK_CLIENT_ID || '',
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
  authorizeUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
  tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
  scope: 'email public_profile',
  async fetchProfile(accessToken) {
    const profile = (await fetchJson('https://graph.facebook.com/me?fields=id,name,email,picture', {
      Authorization: `Bearer ${accessToken}`,
    })) as { id?: string; name?: string; email?: string; picture?: { data?: { url?: string } } };
    return {
      providerId: string(profile.id),
      email: string(profile.email),
      emailVerified: Boolean(profile.email),
      displayName: string(profile.name),
      avatarUrl: string(profile.picture?.data?.url),
    };
  },
};

const twitter: OAuthProviderConfig = {
  clientId: process.env.TWITTER_CLIENT_ID || '',
  clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
  authorizeUrl: 'https://x.com/i/oauth2/authorize',
  tokenUrl: 'https://api.x.com/2/oauth2/token',
  scope: 'users.read tweet.read',
  pkce: true,
  async fetchProfile(accessToken) {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'watchstash',
    };

    const profile = (await fetchJson(
      'https://api.x.com/2/users/me?user.fields=id,name,username,profile_image_url,email',
      headers,
    )) as {
      data?: { id?: string; name?: string; username?: string; profile_image_url?: string; email?: string };
    };

    const data = profile.data ?? {};

    return {
      providerId: string(data.id),
      email: string(data.email || `${data.id}@x.oauth`),
      emailVerified: Boolean(data.email),
      displayName: string(data.name || data.username || ''),
      avatarUrl: string(data.profile_image_url),
    };
  },
};

export const oauthProviders: Record<OAuthProvider, OAuthProviderConfig> = {
  google,
  github,
  facebook,
  twitter,
};

export const providerIdKey = (provider: OAuthProvider): OAuthProviderIdKey =>
  `${provider}Id`;

export function getOAuthProvider(provider: string): OAuthProviderConfig {
  const config = oauthProviders[provider as OAuthProvider];
  if (!config) {
    throw new AppError('Unsupported OAuth provider', 400);
  }
  assertConfigured(config, provider as OAuthProvider);
  return config;
}

export function buildAuthorizeUrl(
  provider: OAuthProvider,
  state: string,
  redirectUri: string,
  codeChallenge?: string,
): string {
  const config = getOAuthProvider(provider);
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scope,
    state,
  });
  if (codeChallenge) {
    params.set('code_challenge', codeChallenge);
    params.set('code_challenge_method', 'S256');
  }
  return `${config.authorizeUrl}?${params.toString()}`;
}

export async function exchangeCodeForProfile(
  provider: OAuthProvider,
  code: string,
  redirectUri: string,
  codeVerifier?: string,
): Promise<OAuthProfile> {
  const config = getOAuthProvider(provider);
  const accessToken = await exchangeCode(config, code, redirectUri, codeVerifier);
  const profile = await config.fetchProfile(accessToken);
  if (!profile.providerId) {
    throw new AppError('OAuth profile is missing an identifier', 400);
  }
  if (!profile.email) {
    throw new AppError('OAuth provider did not return an email address', 400);
  }
  return profile;
}
