import { describe, test, expect, beforeEach } from 'bun:test';
import { cacheWrap, redisConfigured, getRedis } from '../config/upstash.js';

beforeEach(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

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