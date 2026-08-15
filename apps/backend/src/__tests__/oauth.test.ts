import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { generateState, verifyState, readState } from '../utils/oauthState';
import { slugifyUsername, findUniqueUsername } from '../utils/uniqueUsername';
import { findOrCreateUserByOAuth } from '../controllers/oauth';
import type { OAuthProfile } from '../config/oauth';

const MONGODB_URI =
  process.env.OAUTH_TEST_MONGODB_URI || 'mongodb://localhost:27017/watchstash_oauth_test';

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
  process.env.OAUTH_STATE_SECRET = process.env.OAUTH_STATE_SECRET || 'test_oauth_state_secret';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret';
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

describe('pkce state', () => {
  test('should carry codeVerifier through state', () => {
    const verifier = 'test_code_verifier_abc123';
    const state = generateState('twitter', { codeVerifier: verifier });

    expect(verifyState(state, 'twitter')).toBe(true);
    const payload = readState(state, 'twitter');
    expect(payload?.cv).toBe(verifier);
  });

  test('should not return cv when none was set', () => {
    const state = generateState('github');
    const payload = readState(state, 'github');
    expect(payload?.cv).toBeUndefined();
  });

  test('should reject tampered PKCE state', () => {
    const state = generateState('twitter', { codeVerifier: 'real' });
    const tampered = `${state.slice(0, -4)}AAAA`;
    expect(verifyState(tampered, 'twitter')).toBe(false);
  });
});
