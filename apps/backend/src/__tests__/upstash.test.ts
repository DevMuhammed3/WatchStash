import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import express from 'express';
import request from 'supertest';
import { cacheWrap, redisConfigured, getRedis, createRateLimit } from '../config/upstash.js';
import { errorHandler } from '../middleware/errorHandler.js';

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

beforeEach(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

afterEach(() => {
  if (ORIGINAL_NODE_ENV === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  }
  delete process.env.RATE_LIMIT_DISABLED;
});

function limitedApp(limit: number, prefix: string) {
  const app = express();
  app.use(createRateLimit({ id: 'ip', limit, window: '1 m', prefix }));
  app.get('/', (_req, res) => {
    res.status(200).json({ status: 'success' });
  });
  app.use(errorHandler);
  return app;
}

function uniquePrefix(label: string): string {
  return `test:rl:${label}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

describe('upstash config', () => {
  test('reports not configured when env vars are missing', () => {
    expect(redisConfigured()).toBe(false);
  });

  test('reports configured when env vars are present', () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.com';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
    expect(redisConfigured()).toBe(true);
  });

  test('returns no redis client when unconfigured', () => {
    expect(getRedis()).toBeUndefined();
  });
});

describe('in-memory cache fallback', () => {
  test('wrap caches the value and does not re-invoke the factory', async () => {
    let calls = 0;
    const fn = async () => ({ id: ++calls, label: 'cached' });

    const first = await cacheWrap('test:key:1', fn, 60);
    const second = await cacheWrap('test:key:1', fn, 60);

    expect(first).toEqual({ id: 1, label: 'cached' });
    expect(second).toEqual({ id: 1, label: 'cached' });
    expect(calls).toBe(1);
  });

  test('wrap uses distinct cache keys', async () => {
    let calls = 0;
    const fn = async () => ++calls;

    const a = await cacheWrap('test:key:a', fn, 60);
    const b = await cacheWrap('test:key:b', fn, 60);

    expect(a).toBe(1);
    expect(b).toBe(2);
  });
});

describe('rate limiting', () => {
  test('is bypassed outside production', async () => {
    process.env.NODE_ENV = 'test';
    const app = limitedApp(1, uniquePrefix('dev-bypass'));

    for (let i = 0; i < 3; i++) {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
    }
  });

  test('falls back to an in-memory limiter in production without Upstash', async () => {
    process.env.NODE_ENV = 'production';
    const app = limitedApp(2, uniquePrefix('prod-memory'));

    const first = await request(app).get('/');
    const second = await request(app).get('/');
    const third = await request(app).get('/');

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(third.headers['retry-after']).toBeDefined();
    expect(first.headers['x-ratelimit-limit']).toBe('2');
    expect(third.headers['x-ratelimit-remaining']).toBe('0');
  });

  test('RATE_LIMIT_DISABLED cannot disable production enforcement', async () => {
    process.env.NODE_ENV = 'production';
    process.env.RATE_LIMIT_DISABLED = 'true';
    const app = limitedApp(1, uniquePrefix('prod-disabled-env'));

    expect((await request(app).get('/')).status).toBe(200);
    expect((await request(app).get('/')).status).toBe(429);
  });

  test('rejects user-scoped limits without an authenticated user', async () => {
    process.env.NODE_ENV = 'production';
    const app = express();
    app.use(createRateLimit({ id: 'user', limit: 1, window: '1 m', prefix: uniquePrefix('user') }));
    app.get('/', (_req, res) => res.status(200).json({ status: 'success' }));
    app.use(errorHandler);

    const res = await request(app).get('/');

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Not authenticated');
  });
});