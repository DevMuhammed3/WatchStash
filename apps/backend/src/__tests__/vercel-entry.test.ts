import { describe, test, expect, afterAll, beforeAll } from 'bun:test';
import request from 'supertest';
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

const { default: App } = await import('../app.js');
const { connectDB } = await import('../config/db.js');
const { oauthProviders } = await import('../config/oauth.js');

oauthProviders.google.clientId = 'test_google_client_id';
oauthProviders.google.clientSecret = 'test_google_client_secret';

const app = App();

describe('Vercel entrypoint', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    await mongoose.connect(process.env.MONGODB_URI!);
  });

  test('the app factory produces a working Express app', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('WatchStash API is up and running!');
  });

  test('shares the live MongoDB connection and reports health', async () => {
    const conn = await connectDB();

    expect(conn.connection.readyState).toBe(1);

    const health = await request(app).get('/health');

    expect(health.status).toBe(200);
    expect(health.body.mongodb).toBe('connected');
  });

  test('builds https OAuth callback URLs behind the Vercel proxy', async () => {
    const res = await request(app)
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

  test('rejects an OAuth callback with a forged state', async () => {
    const res = await request(app).get(
      '/api/auth/oauth/google/callback?state=encoded.definitely_not_a_valid_sig&code=garbage',
    );
    const body = res.body as { message: string };

    expect(res.status).toBe(400);
    expect(body.message).toBe('Invalid OAuth callback (invalid_signature)');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });
});
