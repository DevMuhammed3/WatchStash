import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import oauthRoutes from '../routes/oauth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import {
  generateState,
  generateNonce,
  verifyState,
  readState,
  registerNonce,
  consumeNonce,
} from '../utils/oauthState.js';
import { oauthProviders } from '../config/oauth.js';
import { slugifyUsername, findUniqueUsername } from '../utils/uniqueUsername.js';
import { findOrCreateUserByOAuth } from '../controllers/oauth.js';
import type { OAuthProfile } from '../config/oauth.js';

const MONGODB_URI =
  process.env.OAUTH_TEST_MONGODB_URI || 'mongodb://localhost:27017/watchstash_oauth_test';

const oauthApp = express();
oauthApp.use(cookieParser());
oauthApp.use('/api/auth/oauth', oauthRoutes);
oauthApp.use(errorHandler);

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
  process.env.OAUTH_STATE_SECRET = process.env.OAUTH_STATE_SECRET || 'test_oauth_state_secret';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret';
  process.env.FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
  process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
  await mongoose.connect(MONGODB_URI);
});

afterAll(async () => {
  await User.deleteMany({});
  await RefreshToken.deleteMany({});
  await mongoose.connection.close();
});

describe('oauthState', () => {
  test('should generate and verify a valid state', () => {
    const state = generateState('google');
    expect(verifyState(state, 'google')).toBe(true);
  });

  test('should reject a tampered state', () => {
    const state = generateState('github');
    const tampered = `${state.slice(0, -4)}AAAA`;
    expect(verifyState(tampered, 'github')).toBe(false);
  });

  test('should reject state signed for a different provider', () => {
    const state = generateState('google');
    expect(verifyState(state, 'github')).toBe(false);
  });

  test('should reject an expired state', async () => {
    const crypto = await import('crypto');
    const encoded = Buffer.from(
      JSON.stringify({ p: 'facebook', iat: Date.now() - 11 * 60 * 1000 }),
    ).toString('base64url');
    const sig = crypto
      .createHmac('sha256', process.env.OAUTH_STATE_SECRET!)
      .update(encoded)
      .digest('base64url');
    expect(verifyState(`${encoded}.${sig}`, 'facebook')).toBe(false);
  });
});

describe('uniqueUsername', () => {
  test('should slugify a display name', () => {
    expect(slugifyUsername('  John Doe!! ')).toBe('john_doe');
    expect(slugifyUsername('Ünïcode')).toBe('n_code');
    expect(slugifyUsername('!!!')).toBe('user');
  });

  test('should append a suffix when the base username is taken', async () => {
    await User.create({
      username: 'taken_name',
      displayName: 'Taken',
      email: 'taken@example.com',
      hasPassword: false,
    });

    const unique = await findUniqueUsername('Taken Name');
    expect(unique).toBe('taken_name_2');
  });

  test('should return the base username when free', async () => {
    const unique = await findUniqueUsername('Brand New Person');
    expect(unique).toBe('brand_new_person');
  });

  test('should skip every taken numeric suffix in one query', async () => {
    await User.create([
      {
        username: 'suffix_taken',
        displayName: 'Suffix Taken',
        email: 'suffix-taken@example.com',
        hasPassword: false,
      },
      {
        username: 'suffix_taken_2',
        displayName: 'Suffix Two',
        email: 'suffix-two@example.com',
        hasPassword: false,
      },
      {
        username: 'suffix_taken_3',
        displayName: 'Suffix Three',
        email: 'suffix-three@example.com',
        hasPassword: false,
      },
      {
        // Shares the prefix but is not a numeric-suffix collision.
        username: 'suffix_taken_extra',
        displayName: 'Suffix Extra',
        email: 'suffix-extra@example.com',
        hasPassword: false,
      },
    ]);

    expect(await findUniqueUsername('Suffix Taken')).toBe('suffix_taken_4');
  });

  test('should still add a suffix when the base is at the length limit', async () => {
    const longName = 'a'.repeat(30);
    await User.create({
      username: longName,
      displayName: 'Long Name',
      email: 'long-name@example.com',
      hasPassword: false,
    });

    // Truncating `root_2` back to 30 characters would return the taken base.
    expect(await findUniqueUsername(longName)).toBe(`${'a'.repeat(27)}_2`);
  });
});

describe('findOrCreateUserByOAuth', () => {
  const googleProfile: OAuthProfile = {
    providerId: 'google-abc-123',
    email: 'oauth.user@example.com',
    emailVerified: true,
    displayName: 'OAuth User',
    avatarUrl: 'https://example.com/avatar.png',
  };

  test('should create a new user for an unknown OAuth profile', async () => {
    const user = await findOrCreateUserByOAuth('google', googleProfile);

    expect(user).toBeDefined();
    expect(user.email).toBe('oauth.user@example.com');
    expect(user.hasPassword).toBe(false);
    expect(user.providers.googleId).toBe('google-abc-123');
    expect(user.username).toMatch(/^oauth_user/);
  });

  test('should reuse an already-linked provider account', async () => {
    const user = await findOrCreateUserByOAuth('google', googleProfile);
    const again = await findOrCreateUserByOAuth('google', googleProfile);

    expect(again._id.toString()).toBe(user._id.toString());
    expect(await User.countDocuments({ 'providers.googleId': 'google-abc-123' })).toBe(1);
  });

  test('should auto-link an existing account with a verified email', async () => {
    const existing = await User.create({
      username: 'preexisting',
      displayName: 'Pre Existing',
      email: 'existing@example.com',
      passwordHash: 'hash',
      hasPassword: true,
    });

    const linked = await findOrCreateUserByOAuth('github', {
      providerId: 'github-777',
      email: 'existing@example.com',
      emailVerified: true,
      displayName: 'Pre Existing',
      avatarUrl: '',
    });

    expect(linked._id.toString()).toBe(existing._id.toString());
    expect(linked.providers.githubId).toBe('github-777');
  });

  test('should not auto-link an account when the email is unverified', async () => {
    const before = await User.countDocuments({ email: 'unverified@example.com' });

    const created = await findOrCreateUserByOAuth('facebook', {
      providerId: 'fb-888',
      email: 'unverified@example.com',
      emailVerified: false,
      displayName: 'Unverified',
      avatarUrl: '',
    });

    expect(before).toBe(0);
    expect(created.email).toBe('unverified@example.com');
    expect(created.providers.facebookId).toBe('fb-888');
  });

  test('should synthesize email for Twitter when X returns no email', async () => {
    const twitterProfile: OAuthProfile = {
      providerId: '123456789',
      email: '123456789@x.oauth',
      emailVerified: false,
      displayName: 'Test Twitter',
      avatarUrl: 'https://pbs.twimg.com/profile_images/test.jpg',
    };

    const user = await findOrCreateUserByOAuth('twitter', twitterProfile);

    expect(user).toBeDefined();
    expect(user.email).toBe('123456789@x.oauth');
    expect(user.hasPassword).toBe(false);
    expect(user.providers.twitterId).toBe('123456789');
  });
});

describe('oauth state nonce', () => {
  test('should carry a nonce and never a code verifier', () => {
    const nonce = generateNonce();
    const state = generateState('twitter', nonce);

    expect(verifyState(state, 'twitter')).toBe(true);
    expect(readState(state, 'twitter')).toEqual({ nonce });

    const encoded = state.split('.')[0]!;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Record<
      string,
      unknown
    >;
    expect(payload.n).toBe(nonce);
    expect(payload.cv).toBeUndefined();
  });

  test('should reject tampered state', () => {
    const state = generateState('twitter', generateNonce());
    const tampered = `${state.slice(0, -4)}AAAA`;
    expect(verifyState(tampered, 'twitter')).toBe(false);
  });

  test('should reject a legacy state that embeds a verifier', async () => {
    const crypto = await import('crypto');
    const encoded = Buffer.from(
      JSON.stringify({ p: 'twitter', iat: Date.now(), cv: 'leaked_verifier' }),
    ).toString('base64url');
    const sig = crypto
      .createHmac('sha256', process.env.OAUTH_STATE_SECRET!)
      .update(encoded)
      .digest('base64url');

    expect(verifyState(`${encoded}.${sig}`, 'twitter')).toBe(false);
  });

  test('nonces are single-use (replay is rejected)', async () => {
    const nonce = generateNonce();
    await registerNonce(nonce);

    expect(await consumeNonce(nonce)).toBe(true);
    expect(await consumeNonce(nonce)).toBe(false);
  });

  test('an unregistered nonce cannot be consumed', async () => {
    expect(await consumeNonce(`never-${generateNonce()}`)).toBe(false);
  });
});

describe('OAuth callback replay and PKCE cookie', () => {
  const realFetch = globalThis.fetch;
  let tokenRequests: string[] = [];

  const json = (data: unknown) =>
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  beforeAll(() => {
    oauthProviders.google.clientId = 'test_google_client_id';
    oauthProviders.google.clientSecret = 'test_google_client_secret';
    oauthProviders.twitter.clientId = 'test_twitter_client_id';
    oauthProviders.twitter.clientSecret = 'test_twitter_client_secret';

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(
        typeof input === 'string' ? input : input instanceof URL ? input.href : String(input),
      );

      if (url.hostname === 'oauth2.googleapis.com') {
        return json({ access_token: 'google-token' });
      }
      if (url.hostname === 'www.googleapis.com') {
        return json({
          sub: 'google-replay-1',
          email: 'oauth-replay@example.com',
          email_verified: true,
          name: 'Replay User',
          picture: '',
        });
      }
      if (url.hostname === 'api.x.com' && url.pathname.endsWith('/token')) {
        tokenRequests.push(String(init?.body ?? ''));
        return json({ access_token: 'x-token' });
      }
      if (url.hostname === 'api.x.com') {
        return json({
          data: { id: 'tw-replay-1', name: 'Twitter Replay', email: 'tw-replay@example.com' },
        });
      }
      return new Response('not found', { status: 404 });
    }) as typeof fetch;
  });

  afterAll(() => {
    globalThis.fetch = realFetch;
  });

  function cookieHeader(res: request.Response, name: string): string {
    const raw = res.headers['set-cookie'] as unknown as string | string[] | undefined;
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return list.find((cookie) => cookie.startsWith(`${name}=`)) ?? '';
  }

  function cookieValue(header: string, name: string): string {
    return header.slice(name.length + 1).split(';')[0] ?? '';
  }

  test('a replayed callback fails the second time', async () => {
    const authorize = await request(oauthApp).get('/api/auth/oauth/google/authorize');
    expect(authorize.status).toBe(302);

    const location = new URL(authorize.headers.location!);
    const state = location.searchParams.get('state')!;
    const callback = `/api/auth/oauth/google/callback?state=${encodeURIComponent(state)}&code=good`;

    const first = await request(oauthApp).get(callback);
    expect(first.status).toBe(302);

    const replay = await request(oauthApp).get(callback);
    expect(replay.status).toBe(400);
    expect(replay.body.message).toBe('Invalid OAuth callback (replayed_state)');
  });

  test('PKCE verifier is stored in an httpOnly cookie, not in the state', async () => {
    const authorize = await request(oauthApp).get('/api/auth/oauth/twitter/authorize');
    expect(authorize.status).toBe(302);

    const location = new URL(authorize.headers.location!);
    const state = location.searchParams.get('state')!;
    const cookie = cookieHeader(authorize, 'watchstash_oauth_pkce');

    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/api/auth/oauth/twitter/callback');
    expect(cookieValue(cookie, 'watchstash_oauth_pkce')).not.toBe('');

    // The verifier must not be recoverable from the state.
    const payload = JSON.parse(
      Buffer.from(state.split('.')[0]!, 'base64url').toString('utf8'),
    ) as Record<string, unknown>;
    expect(payload.cv).toBeUndefined();

    const callback = `/api/auth/oauth/twitter/callback?state=${encodeURIComponent(state)}&code=abc`;

    // Without the cookie, the state is not usable.
    const missingCookie = await request(oauthApp).get(callback);
    expect(missingCookie.status).toBe(400);
    expect(missingCookie.body.message).toBe('Invalid OAuth callback (state_mismatch)');

    // With the cookie, the verifier from the cookie is sent to the provider.
    const withCookie = await request(oauthApp)
      .get(callback)
      .set('Cookie', `watchstash_oauth_pkce=${cookieValue(cookie, 'watchstash_oauth_pkce')}`);
    expect(withCookie.status).toBe(302);
    expect(tokenRequests.at(-1)).toContain('code_verifier=');
  });
});
