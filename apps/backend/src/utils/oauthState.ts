import crypto from 'crypto';
import { getRedis } from '../config/upstash.js';

const STATE_TTL_MS = 10 * 60 * 1000;
const NONCE_TTL_SECONDS = STATE_TTL_MS / 1000;
const NONCE_PREFIX = 'oauth:nonce:';

// Nonces are single-use. Redis is used only in production (where it is shared
// across instances); dev/test and a Redis-less production fall back to a
// per-instance map.
const memoryNonces = new Map<string, number>();

function nonceKey(nonce: string): string {
  return `${NONCE_PREFIX}${nonce}`;
}

function useRedisNonces(): boolean {
  return process.env.NODE_ENV === 'production' && Boolean(getRedis());
}

function pruneExpiredNonces(now: number): void {
  for (const [nonce, expiresAt] of memoryNonces) {
    if (expiresAt <= now) memoryNonces.delete(nonce);
  }
}

/** Registers a nonce for 10 minutes. */
export async function registerNonce(nonce: string): Promise<void> {
  if (useRedisNonces()) {
    await getRedis()!.set(nonceKey(nonce), '1', { ex: NONCE_TTL_SECONDS });
    return;
  }

  const now = Date.now();
  pruneExpiredNonces(now);
  memoryNonces.set(nonce, now + STATE_TTL_MS);
}

/**
 * Atomically claims a nonce. Returns false when it was already used or has
 * expired, which is what makes a replayed callback fail.
 */
export async function consumeNonce(nonce: string): Promise<boolean> {
  if (useRedisNonces()) {
    return (await getRedis()!.del(nonceKey(nonce))) > 0;
  }

  const expiresAt = memoryNonces.get(nonce);
  memoryNonces.delete(nonce);
  return expiresAt !== undefined && expiresAt > Date.now();
}

function getStateSecret(): string {
  if(process.env.OAUTH_STATE_SECRET === undefined){
      throw Error("OAUTH_STATE_SECRET is missing!");
  }
  return process.env.OAUTH_STATE_SECRET
}

interface StatePayload {
  p: string;
  iat: number;
  /** Single-use nonce; the PKCE verifier lives in an httpOnly cookie. */
  n: string;
}

function encode(payload: StatePayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decode(raw: string): StatePayload | null {
  try {
    return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as StatePayload;
  } catch {
    return null;
  }
}

function sign(data: string): string {
  return crypto.createHmac('sha256', getStateSecret()).update(data).digest('base64url');
}

export function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64url');
}

export function generateState(provider: string, nonce: string = generateNonce()): string {
  const payload: StatePayload = { p: provider, iat: Date.now(), n: nonce };
  const encoded = encode(payload);
  return `${encoded}.${sign(encoded)}`;
}

export function verifyState(state: string, provider: string): boolean {
  return readState(state, provider) !== null;
}

export type StateRejectionReason =
  | 'malformed'
  | 'invalid_signature'
  | 'provider_mismatch'
  | 'expired';

export function diagnoseState(
  state: string,
  provider: string,
): { ok: true; nonce: string } | { ok: false; reason: StateRejectionReason } {
  const [encoded, signature] = state.split('.');
  if (!encoded || !signature) {
    return { ok: false, reason: 'malformed' };
  }

  const expected = sign(encoded);
  const signatureBuffer = Buffer.from(signature, 'base64url');
  const expectedBuffer = Buffer.from(expected, 'base64url');
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return { ok: false, reason: 'invalid_signature' };
  }

  const payload = decode(encoded);
  if (!payload || payload.p !== provider) {
    return { ok: false, reason: 'provider_mismatch' };
  }

  if (Date.now() - payload.iat > STATE_TTL_MS) {
    return { ok: false, reason: 'expired' };
  }

  // States issued before the nonce migration are not accepted: they may still
  // carry the PKCE verifier in the payload.
  if (typeof payload.n !== 'string' || payload.n.length === 0) {
    return { ok: false, reason: 'malformed' };
  }

  return { ok: true, nonce: payload.n };
}

export function readState(state: string, provider: string): { nonce: string } | null {
  const verdict = diagnoseState(state, provider);
  return verdict.ok ? { nonce: verdict.nonce } : null;
}

export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}
