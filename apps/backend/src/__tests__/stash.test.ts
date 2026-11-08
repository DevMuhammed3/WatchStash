import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { stashRouter } from '../routes/media.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { User } from '../models/User.js';
import { StashItem } from '../models/StashItem.js';
import { generateAccessToken } from '../config/jwt.js';
import { testDatabaseUri, TEST_DATABASE_NAME } from './helpers/testDatabaseUri.js';

// Bare app: the production routers attach shared Upstash rate limiters that
// tests must not consume. `stashRouter` also carries its own auth middleware.
const app = express();
app.use(express.json());
app.use('/api/stash', stashRouter);
app.use(errorHandler);

const suffix = Date.now().toString(36);
const username = `stash${suffix}`;
const email = `${username}@example.com`;
const externalId = `concurrent-${suffix}`;

let accessToken = '';
let userId = '';

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret';
  process.env.TMDB_ACCESS_TOKEN = 'test_tmdb_token';

  // Deterministic TMDB details payload: the test is about the insert race, not
  // about the upstream client.
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(
      typeof input === 'string' ? input : input instanceof URL ? input.href : String(input),
    );
    const path = url.pathname.replace(/^\/3(?=\/)/, '');
    if (path.startsWith('/movie/')) {
      return new Response(
        JSON.stringify({
          id: Number(externalId.split('-').pop()) || 1,
          title: 'Concurrent Test Movie',
          release_date: '2024-01-01',
          overview: '',
          poster_path: null,
          backdrop_path: null,
          genres: [],
          vote_average: 0,
          vote_count: 0,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response('Not found', { status: 404 });
  }) as typeof fetch;

  await mongoose.connect(testDatabaseUri());
  await User.init();
  // Build the unique compound index before racing two inserts.
  await StashItem.init();

  const user = await User.create({
    username,
    displayName: 'Stash Race',
    email,
    hasPassword: false,
  });
  userId = user._id.toString();
  accessToken = generateAccessToken(userId);
});

afterAll(async () => {
  delete process.env.TMDB_ACCESS_TOKEN;
  if (mongoose.connection.db?.databaseName === TEST_DATABASE_NAME) {
    await StashItem.deleteMany({ userId });
    await User.deleteMany({ username });
  }
  await mongoose.connection.close();
});

describe('POST /api/stash/from-provider', () => {
  test('the unique compound index exists', async () => {
    const indexes = await StashItem.collection.indexes();
    const unique = indexes.find((index) => index.name === 'uniq_user_provider_external_type');

    expect(unique).toBeDefined();
    expect(unique?.unique).toBe(true);
    expect(unique?.key).toEqual({
      userId: 1,
      provider: 1,
      externalId: 1,
      type: 1,
    });
  });

  test('two concurrent requests for the same item create exactly one document', async () => {
    const payload = {
      provider: 'tmdb',
      externalId,
      type: 'movie',
    };

    const [first, second] = await Promise.all([
      request(app)
        .post('/api/stash/from-provider')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload),
      request(app)
        .post('/api/stash/from-provider')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload),
    ]);

    expect([first.status, second.status].sort()).toEqual([201, 409]);

    const stored = await StashItem.countDocuments({
      userId,
      provider: 'tmdb',
      externalId,
      type: 'movie',
    });
    expect(stored).toBe(1);
  });
});
