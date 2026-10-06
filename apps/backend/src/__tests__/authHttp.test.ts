import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import mongoose from 'mongoose';
import authRoutes from '../routes/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { hashToken } from '../config/jwt.js';
import { REFRESH_COOKIE_NAME } from '../utils/refreshCookie.js';
import { testDatabaseUri, TEST_DATABASE_NAME } from './helpers/testDatabaseUri.js';

// Mount the real auth routes on a bare app instead of `App()`: the production
// app's auth limiter talks to a shared Upstash Redis, and a test suite must
// neither spend the dev/browser quota nor fail with 429.
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use(errorHandler);

const suffix = Date.now().toString(36);
const username = `authhttp${suffix}`;
const email = `${username}@example.com`;

/** The watchstash_refresh Set-Cookie header of a response, if any. */
function refreshCookieHeader(res: request.Response): string {
  const raw = res.headers['set-cookie'] as unknown as string | string[] | undefined;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list.find((cookie) => cookie.startsWith(`${REFRESH_COOKIE_NAME}=`)) ?? '';
}

/** The bare token value inside a Set-Cookie header. */
function cookieValue(header: string): string {
  return header.slice(REFRESH_COOKIE_NAME.length + 1).split(';')[0] ?? '';
}

describe('Auth cookie flow', () => {
  let accessToken = '';
  let refreshToken = '';
  // The token from the rotation before the current one — already revoked, so
  // it is what a double-submit (grace) or a late replay looks like.
  let previousToken = '';

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret';
    await mongoose.connect(testDatabaseUri());
    await User.init();
    await RefreshToken.init();
  });

  afterAll(async () => {
    if (mongoose.connection.db?.databaseName === TEST_DATABASE_NAME) {
      await User.deleteMany({ username });
      await RefreshToken.deleteMany({ user: { $exists: true } });
    }
    await mongoose.connection.close();
  });

  test('register issues an httpOnly refresh cookie scoped to /api/auth', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username,
      displayName: 'Auth Http',
      email,
      password: 'Password1',
    });

    expect(res.status).toBe(201);
    const header = refreshCookieHeader(res);
    expect(header).toContain(`${REFRESH_COOKIE_NAME}=`);
    expect(header).toContain('HttpOnly');
    expect(header).toContain('Path=/api/auth');
    // Same lifetime as REFRESH_TOKEN_EXPIRY_DAYS.
    expect(header).toContain('Max-Age=604800');
    expect(header).toContain('SameSite=Lax');

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
    expect(typeof accessToken).toBe('string');
    expect(typeof refreshToken).toBe('string');
  });

  test('legacy callers that send the token in the body still get one back', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe('string');
    // Only body-based callers are echoed; this keeps pre-cookie sessions
    // working while they migrate.
    expect(typeof res.body.refreshToken).toBe('string');
    refreshToken = cookieValue(refreshCookieHeader(res));
    expect(refreshToken).not.toBe('');
  });

  test('refreshes from the cookie alone and never returns the refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `${REFRESH_COOKIE_NAME}=${refreshToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe('string');
    expect(res.body.refreshToken).toBeUndefined();

    const rotated = cookieValue(refreshCookieHeader(res));
    expect(rotated).not.toBe('');
    expect(rotated).not.toBe(refreshToken);
    previousToken = refreshToken;
    refreshToken = rotated;
  });

  test('rejects a refresh with neither cookie nor body token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Refresh token is required');
  });

  test('rotation grace: an immediate double-submit still succeeds', async () => {
    // `previousToken` was rotated by the previous test, so replaying it is a
    // double-submit — exactly the race the grace window exists for.
    const rotatedToken = await RefreshToken.findOne({
      token: hashToken(previousToken),
      revoked: true,
    });
    expect(typeof rotatedToken?.replacedBy).toBe('string');

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `${REFRESH_COOKIE_NAME}=${previousToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe('string');

    // The token issued by the rotation we just replaced is retired, so no
    // orphaned copy outlives this response.
    const orphan = await RefreshToken.findOne({ token: rotatedToken!.replacedBy });
    expect(orphan?.revoked).toBe(true);

    refreshToken = cookieValue(refreshCookieHeader(res));
  });

  test('rotation grace expires: a late replay is rejected', async () => {
    await RefreshToken.updateOne(
      { token: hashToken(previousToken), revoked: true },
      { rotatedAt: new Date(Date.now() - 11_000) },
    );

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `${REFRESH_COOKIE_NAME}=${previousToken}`)
      .send({});

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Refresh token has been revoked or expired');
  });

  test('logout revokes the session without any access token', async () => {
    // Deliberately no Authorization header: signing out after the 15-minute
    // access token expired used to fail and left the session alive for days.
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', `${REFRESH_COOKIE_NAME}=${refreshToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(refreshCookieHeader(res)).toContain(`${REFRESH_COOKIE_NAME}=;`);

    const stored = await RefreshToken.findOne({ token: hashToken(refreshToken) });
    expect(stored?.revoked).toBe(true);
  });

  test('the revoked cookie can no longer refresh', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `${REFRESH_COOKIE_NAME}=${refreshToken}`)
      .send({});

    expect(res.status).toBe(401);
  });

  test('rejects auth POSTs from a foreign origin', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Origin', 'https://evil.example')
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Cross-origin request rejected');
  });

  test('accepts auth POSTs from the configured frontend origin', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Origin', process.env.CORS_ORIGIN || 'http://localhost:3000')
      .send({});

    // Past the origin guard; it fails on the missing token instead.
    expect(res.status).toBe(401);
  });

  test('accepts auth POSTs without an Origin header (non-browser clients)', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(401);
  });
});
