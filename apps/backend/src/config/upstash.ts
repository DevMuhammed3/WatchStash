import type { NextFunction, Request, Response } from 'express';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { createCache, type Cache } from 'cache-manager';
import { Keyv, type KeyvStoreAdapter } from 'keyv';
import { AppError } from '../utils/AppError.js';
import logger from './logger.js';

const SINGLETON_KEY = Symbol.for('watchstash.upstash');

interface UpstashSingletons {
  redis?: Redis;
  cache?: Cache;
}

function singleton(): UpstashSingletons {
  const global = globalThis as typeof globalThis & { [SINGLETON_KEY]?: UpstashSingletons };
  global[SINGLETON_KEY] ??= {};
  return global[SINGLETON_KEY]!;
}

let warned = false;
function warnOnce(message: string) {
  if (!warned) {
    warned = true;
    logger.warn(message);
  }
}

export function redisConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

export function getRedis(): Redis | undefined {
  if (!redisConfigured()) return undefined;
  const state = singleton();
  if (!state.redis) {
    state.redis = Redis.fromEnv();
  }
  return state.redis;
}

/**
 * Keyv store adapter backed by Upstash Redis. Keyv handles JSON
 * serialization + expiry bookkeeping; Redis TTL (`ex`) does the hard delete.
 */
class UpstashStore implements KeyvStoreAdapter {
  opts: unknown = {};

  constructor(private readonly redis: Redis) {}

  async get<Value>(key: string): Promise<Value | undefined> {
    return (await this.redis.get<Value>(key)) ?? undefined;
  }

  async set(key: string, value: unknown, ttl?: number): Promise<boolean> {
    const ttlSeconds = ttl ? Math.max(1, Math.ceil(ttl / 1000)) : undefined;
    if (ttlSeconds) {
      await this.redis.set(key, value as string, { ex: ttlSeconds });
    } else {
      await this.redis.set(key, value as string);
    }
    return true;
  }

  async delete(key: string): Promise<boolean> {
    return (await this.redis.del(key)) > 0;
  }

  async clear(): Promise<void> {
    await this.redis.flushdb();
  }

  on(): this {
    return this;
  }
}

export function getCache(): Cache {
  const state = singleton();
  if (state.cache) return state.cache;

  const redis = getRedis();
  if (redis) {
    state.cache = createCache({
      stores: [new Keyv({ store: new UpstashStore(redis), namespace: 'watchstash' })],
    });
  } else {
    warnOnce(
      'UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set - using in-memory cache (dev/test only).',
    );
    state.cache = createCache();
  }
  return state.cache;
}

export async function cacheWrap<T>(key: string, fn: () => Promise<T>, ttlSeconds: number): Promise<T> {
  return getCache().wrap(key, fn, ttlSeconds * 1000);
}

interface RateLimitOptions {
  id: 'ip' | 'user';
  limit: number;
  window: `${number} s` | `${number} m` | `${number} h` | `${number} d`;
  prefix: string;
}

const WINDOW_UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

function windowToMs(window: RateLimitOptions['window']): number {
  const [amount, unit] = window.split(' ');
  const multiplier = WINDOW_UNIT_MS[unit ?? ''] ?? WINDOW_UNIT_MS.m!;
  return Math.max(1, Number(amount)) * multiplier;
}

interface MemoryCounter {
  count: number;
  resetAt: number;
}

// Per-instance fallback for production deployments that have not configured
// Upstash. It is not shared across serverless instances, but it still enforces
// the limit within one process instead of silently allowing everything.
const memoryCounters = new Map<string, MemoryCounter>();
let lastMemoryCleanup = 0;

function cleanupMemoryCounters(now: number): void {
  // Sweep at most once a minute so the map cannot grow without bound.
  if (now - lastMemoryCleanup < 60_000) return;
  lastMemoryCleanup = now;
  for (const [key, counter] of memoryCounters) {
    if (counter.resetAt <= now) memoryCounters.delete(key);
  }
}

function createInMemoryRateLimit(options: RateLimitOptions) {
  const { id, limit, window, prefix } = options;
  const windowMs = windowToMs(window);

  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = id === 'user' ? req.user?.id : req.ip;
    if (!identifier) {
      next(new AppError('Not authenticated', 401));
      return;
    }

    const now = Date.now();
    cleanupMemoryCounters(now);

    const key = `${prefix}:${identifier}`;
    let counter = memoryCounters.get(key);
    if (!counter || counter.resetAt <= now) {
      counter = { count: 0, resetAt: now + windowMs };
      memoryCounters.set(key, counter);
    }
    counter.count += 1;

    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - counter.count)));
    res.setHeader('X-RateLimit-Reset', String(counter.resetAt));

    if (counter.count > limit) {
      const retryAfter = Math.max(1, Math.ceil((counter.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ status: 'error', message: 'Too many requests, please try again later' });
      return;
    }

    next();
  };
}

let rateLimitWarned = false;

/**
 * Redis-backed sliding-window rate limit.
 *
 * - Development/test: pass-through, so local work and the test suite stay
 *   frictionless.
 * - Production with Upstash: distributed sliding window.
 * - Production without Upstash: per-instance in-memory fixed window plus a
 *   startup warning. RATE_LIMIT_DISABLED is intentionally ignored in
 *   production so a stale env var can never turn protection off.
 */
export function createRateLimit(options: RateLimitOptions) {
  const { id, limit, window, prefix } = options;

  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  const redis = getRedis();
  if (!redis) {
    if (!rateLimitWarned) {
      rateLimitWarned = true;
      logger.warn(
        'Upstash Redis is not configured in production - using a per-instance in-memory rate limiter. Limits are not shared across instances.',
      );
    }
    return createInMemoryRateLimit(options);
  }

  const ratelimit = new Ratelimit({
    redis,
    prefix,
    limiter: Ratelimit.slidingWindow(limit, window),
  });

  return async (req: Request, res: Response, next: NextFunction) => {
    const identifier = id === 'user' ? req.user?.id : req.ip;
    if (!identifier) {
      next(new AppError('Not authenticated', 401));
      return;
    }

    const result = await ratelimit.limit(identifier);
    res.setHeader('X-RateLimit-Limit', String(result.limit));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));
    res.setHeader('X-RateLimit-Reset', String(result.reset));

    if (!result.success) {
      const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ status: 'error', message: 'Too many requests, please try again later' });
      return;
    }

    next();
  };
}