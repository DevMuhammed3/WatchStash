import { describe, test, expect, beforeAll } from 'bun:test';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { stashRouter, mediaRouter } from '../routes/media.js';
import movieRoutes from '../routes/movie.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { generateAccessToken } from '../config/jwt.js';
import { paginationQuerySchema } from '../validations/common.js';

const app = express();
app.use(express.json());
app.use('/api/stash', stashRouter);
app.use('/api/movies', movieRoutes);
app.use('/api/media', mediaRouter);
app.use(errorHandler);

let auth = '';

beforeAll(() => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
  auth = `Bearer ${generateAccessToken(new mongoose.Types.ObjectId().toString())}`;
});

describe('pagination schema', () => {
  test('coerces numeric strings and applies defaults', () => {
    expect(paginationQuerySchema.parse({ page: '2', limit: '10' })).toEqual({
      page: 2,
      limit: 10,
    });
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, limit: 50 });
  });
});

describe('route param and pagination validation', () => {
  test('rejects an invalid stash ObjectId before hitting Mongo', async () => {
    const res = await request(app)
      .patch('/api/stash/not-an-object-id')
      .set('Authorization', auth)
      .send({ status: 'watching' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid ID format');
  });

  test('rejects an invalid stash id on delete', async () => {
    const res = await request(app)
      .delete('/api/stash/not-an-object-id')
      .set('Authorization', auth);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid ID format');
  });

  test('rejects an invalid movie id', async () => {
    const res = await request(app)
      .patch('/api/movies/not-an-object-id/toggle-watched')
      .set('Authorization', auth);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid ID format');
  });

  test('rejects invalid stash pagination', async () => {
    const badPage = await request(app)
      .get('/api/stash?page=0')
      .set('Authorization', auth);
    const badLimit = await request(app)
      .get('/api/stash?limit=101')
      .set('Authorization', auth);

    expect(badPage.status).toBe(400);
    expect(badLimit.status).toBe(400);
  });

  test('rejects invalid movie pagination', async () => {
    const badPage = await request(app)
      .get('/api/movies?page=abc')
      .set('Authorization', auth);
    const badLimit = await request(app)
      .get('/api/movies?limit=0')
      .set('Authorization', auth);

    expect(badPage.status).toBe(400);
    expect(badLimit.status).toBe(400);
  });

  test('rejects an unsupported media provider', async () => {
    const res = await request(app)
      .get('/api/media/details/netflix/123')
      .set('Authorization', auth);

    expect(res.status).toBe(400);
  });

  test('rejects a non-numeric TMDB id', async () => {
    const res = await request(app)
      .get('/api/media/details/tmdb/not-a-number')
      .set('Authorization', auth);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid media ID');
  });
});
