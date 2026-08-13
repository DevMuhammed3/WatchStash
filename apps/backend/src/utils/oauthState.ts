import crypto from 'crypto';

const STATE_TTL_MS = 10 * 60 * 1000;

function getStateSecret(): string {
  if(process.env.OAUTH_STATE_SECRET === undefined){
      throw Error("OAUTH_STATE_SECRET is missing!");
  }
  return process.env.OAUTH_STATE_SECRET
}

interface StatePayload {
  p: string;
  iat: number;
  cv?: string;
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

export function generateState(provider: string, opts?: { codeVerifier?: string }): string {
  const payload: StatePayload = { p: provider, iat: Date.now() };
  if (opts?.codeVerifier) {
    payload.cv = opts.codeVerifier;
  }
  const encoded = encode(payload);
  return `${encoded}.${sign(encoded)}`;
}

export function verifyState(state: string, provider: string): boolean {
  return readState(state, provider) !== null;
}

export function readState(state: string, provider: string): { cv?: string } | null {
  const [encoded, signature] = state.split('.');
  if (!encoded || !signature) {
    return null;
  }

  const expected = sign(encoded);
  const signatureBuffer = Buffer.from(signature, 'base64url');
  const expectedBuffer = Buffer.from(expected, 'base64url');
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  const payload = decode(encoded);
  if (!payload || payload.p !== provider) {
    return null;
  }

  if (Date.now() - payload.iat > STATE_TTL_MS) {
    return null;
  }

  return { cv: payload.cv };
}

export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}
