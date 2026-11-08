import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { stashRouter } from '../routes/media.js';
import movieRoutes from '../routes/movie.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { User } from '../models/User.js';
import { StashItem } from '../models/StashItem.js';
import { Movie } from '../models/Movie.js';
import { generateAccessToken } from '../config/jwt.js';
import { testDatabaseUri, TEST_DATABASE_NAME } from './helpers/testDatabaseUri.js';

const app = express();
app.use(express.json());
app.use('/api/stash', stashRouter);
app.use('/api/movies', movieRoutes);
app.use(errorHandler);

const suffix = Date.now().toString(36);
const username = `list${suffix}`;
let userId = '';
let accessToken = '';

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

  await mongoose.connect(testDatabaseUri());
  await User.init();

  const user = await User.create({
    username,
    displayName: 'List Queries',
    email: `${username}@example.com`,
    hasPassword: false,
  });
  userId = user._id.toString();
  accessToken = generateAccessToken(userId);

  const older = new Date(Date.now() - 60_000);
  const newer = new Date();

  await StashItem.collection.insertMany([
    {
      userId: user._id,
      title: 'Older Item',
      type: 'movie',
      status: 'plan_to_watch',
      progress: { currentEpisode: 0, currentSeason: 1 },
      provider: 'tmdb',
      externalId: `list-older-${suffix}`,
      createdAt: older,
      updatedAt: older,
    },
    {
      userId: user._id,
      title: 'Newer Item',
      type: 'movie',
      status: 'watching',
      progress: { currentEpisode: 0, currentSeason: 1 },
      provider: 'tmdb',
      externalId: `list-newer-${suffix}`,
      createdAt: newer,
      updatedAt: newer,
    },
  ]);

  await Movie.collection.insertMany([
    {
      userId: user._id,
      title: 'Older Movie',
      description: '',
      genre: [],
      watched: false,
      createdAt: older,
      updatedAt: older,
    },
    {
      userId: user._id,
      title: 'Newer Movie',
      description: '',
      genre: [],
      watched: true,
      createdAt: newer,
      updatedAt: newer,
    },
  ]);
});

afterAll(async () => {
  if (mongoose.connection.db?.databaseName === TEST_DATABASE_NAME) {
    await StashItem.deleteMany({ userId });
    await Movie.deleteMany({ userId });
    await User.deleteMany({ username });
  }
  await mongoose.connection.close();
});

describe('list endpoints use lean read-only queries', () => {
  test('GET /api/stash returns plain objects sorted newest first', async () => {
    const res = await request(app)
      .get('/api/stash?page=1&limit=10')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items.map((item: { title: string }) => item.title)).toEqual([
      'Newer Item',
      'Older Item',
    ]);
    expect(res.body.pagination).toEqual({ page: 1, limit: 10, total: 2, pages: 1 });

    const [first] = res.body.items as Array<Record<string, unknown>>;
    expect(typeof first!._id).toBe('string');
    // Hydrated Mongoose documents expose `save`; lean results do not.
    expect(first!.save).toBeUndefined();
  });

  test('GET /api/movies returns plain objects sorted newest first', async () => {
    const res = await request(app)
      .get('/api/movies?page=1&limit=10')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.movies.map((movie: { title: string }) => movie.title)).toEqual([
      'Newer Movie',
      'Older Movie',
    ]);
    expect(res.body.pagination).toEqual({ page: 1, limit: 10, total: 2, pages: 1 });

    const [first] = res.body.movies as Array<Record<string, unknown>>;
    expect(typeof first!._id).toBe('string');
    expect(first!.save).toBeUndefined();
  });
});
