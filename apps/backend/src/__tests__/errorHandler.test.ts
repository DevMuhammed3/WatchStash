import { describe, test, expect } from 'bun:test';
import express from 'express';
import request from 'supertest';
import { errorHandler } from '../middleware/errorHandler.js';
import { AppError } from '../utils/AppError.js';

const app = express();

app.get('/retry', (_req, _res, next) => {
  next(new AppError('Upstream TMDB rate limit exceeded', 503, true, { 'Retry-After': '42' }));
});

app.get('/duplicate', (_req, _res, next) => {
  const error = new Error('E11000 duplicate key') as Error & {
    code?: number;
    keyValue?: Record<string, string>;
  };
  error.code = 11000;
  error.keyValue = { userId: 'abc' };
  next(error);
});

app.use(errorHandler);

describe('errorHandler', () => {
  test('applies headers carried by an AppError', async () => {
    const res = await request(app).get('/retry');

    expect(res.status).toBe(503);
    expect(res.headers['retry-after']).toBe('42');
    expect(res.body.message).toBe('Upstream TMDB rate limit exceeded');
  });

  test('maps duplicate-key errors to 409', async () => {
    const res = await request(app).get('/duplicate');

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('userId already in use');
  });
});
