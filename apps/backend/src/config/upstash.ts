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

/**
 * Redis-backed sliding-window rate limit. Falls back to pass-through when
 * Upstash is not configured (local dev / tests).
 */
export function createRateLimit(options: RateLimitOptions) {
  const { id, limit, window, prefix } = options;

  const isProduction = process.env.NODE_ENV === 'production';

  // Development and tests must remain frictionless. Rate-limit bypass is
  // permitted only outside production, no matter what environment variables
  // are provided, so a stale RATE_LIMIT_DISABLED=true can never disable
  // production enforcement.
  const requestedBypass = process.env.RATE_LIMIT_DISABLED === 'true';
  if (!isProduction && (requestedBypass || true)) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  const redis = getRedis();
  if (!redis) {
    // Production without Redis cannot enforce distributed limits. Keep the
    // application available rather than failing closed on every request, but log
    // the degraded state.
    logger.warn('Rate limiting disabled in production: Upstash Redis is not configured.');
    return (_req: Request, _res: Response, next: NextFunction) => next();
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