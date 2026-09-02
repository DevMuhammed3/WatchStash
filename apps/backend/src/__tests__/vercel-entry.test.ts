import { describe, test, expect, afterAll, beforeAll } from 'bun:test';
import request from 'supertest';
import http from 'node:http';
import mongoose from 'mongoose';

process.env.JWT_SECRET ??= 'test_secret';
process.env.JWT_REFRESH_SECRET ??= 'test_refresh_secret';
process.env.OAUTH_STATE_SECRET ??= 'test_oauth_state_secret';
process.env.MONGODB_URI =
  process.env.OAUTH_TEST_MONGODB_URI || 'mongodb://localhost:27017/watchstash_oauth_test';
process.env.CORS_ORIGIN ??= 'http://localhost:3000';
process.env.FRONTEND_ORIGIN ??= 'http://localhost:3000';
process.env.GOOGLE_CLIENT_ID ??= 'test_google_client_id';
process.env.GOOGLE_CLIENT_SECRET ??= 'test_google_client_secret';

const { default: handler } = await import('../../api/server.js');
const { connectDB } = await import('../config/db.js');
const { oauthProviders } = await import('../config/oauth.js');

oauthProviders.google.clientId = 'test_google_client_id';
oauthProviders.google.clientSecret = 'test_google_client_secret';

describe('Vercel entrypoint', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    await mongoose.connect(process.env.MONGODB_URI!);
  });

  test('exports the Express app and serves its routes', async () => {
    const response = await request(handler).get('/');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('WatchStash API is up and running!');
  });

  test('shares the live MongoDB connection and reports health', async () => {
    const conn = await connectDB();

    expect(conn.connection.readyState).toBe(1);

    const health = await request(handler).get('/health');

    expect(health.status).toBe(200);
    expect(health.body.mongodb).toBe('connected');
  });

  test('builds https OAuth callback URLs behind the Vercel proxy', async () => {
    const res = await request(handler)
      .get('/api/auth/oauth/google/authorize')
      .set('Host', 'watchstash-backend.vercel.app')
      .set('X-Forwarded-Proto', 'https');

    expect(res.status).toBe(302);

    const location = new URL(res.headers.location!);
    expect(location.origin + location.pathname).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth',
    );
    expect(location.searchParams.get('redirect_uri')).toBe(
      'https://watchstash-backend.vercel.app/api/auth/oauth/google/callback',
    );
    expect(location.searchParams.get('state')).toBeTruthy();
    expect(location.searchParams.get('client_id')).toBeTruthy();
  });

  test('responds 503 when MongoDB is unavailable', async () => {
    const originalUri = process.env.MONGODB_URI;
    delete process.env.MONGODB_URI;

    try {
      const res = await request(handler).get('/');
      expect(res.status).toBe(503);
      expect(res.body.message).toBe('Database unavailable');
    } finally {
      if (originalUri === undefined) {
        delete process.env.MONGODB_URI;
      } else {
        process.env.MONGODB_URI = originalUri;
      }
    }
  });

  test('parses callback query params through the Vercel bridge', async () => {
    const srv = http.createServer((req, res) => {
      Object.defineProperty(req, 'query', {
        value: {},
        configurable: true,
        enumerable: true,
        writable: true,
      });
      void handler(req, res);
    });
    await new Promise<void>((resolve) => srv.listen(0, '127.0.0.1', resolve));

    const address = srv.address();
    if (!address || typeof address === 'string') {
      throw new Error('expected a bound TCP server');
    }

    try {
      const res = await fetch(
        `http://127.0.0.1:${address.port}/api/auth/oauth/google/callback?state=encoded.definitely_not_a_valid_sig&code=garbage`,
      );
      const body = (await res.json()) as { message: string };

      expect(res.status).toBe(400);
      expect(body.message).toBe('Invalid OAuth callback (invalid_signature)');
    } finally {
      await new Promise<void>((resolve) => srv.close(() => resolve()));
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });
});
