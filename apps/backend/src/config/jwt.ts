import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const JWT_ALGORITHM = 'HS256' as const;
const JWT_ISSUER = 'watchstash';
const JWT_AUDIENCE = 'watchstash-api';

function requireSecret(name: string): string {
  const secret = process.env[name];
  if (!secret) {
    throw new Error(`${name} is not defined in environment variables`);
  }
  return secret;
}

export interface AccessTokenPayload {
  id: string;
}

export interface RefreshTokenPayload {
  id: string;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateAccessToken(userId: string): string {
  return jwt.sign({ id: userId }, requireSecret('JWT_SECRET'), {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    algorithm: JWT_ALGORITHM,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    {
      id: userId,
      // The payload would otherwise be deterministic: a second token issued
      // to the same user within the same second would be byte-identical,
      // which defeats rotation entirely (the "old" hash would match a
      // freshly issued, still-valid row). A unique jti makes every issuance
      // distinct.
      jti: crypto.randomUUID(),
    },
    requireSecret('JWT_REFRESH_SECRET'),
    {
      expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d`,
      algorithm: JWT_ALGORITHM,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    },
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, requireSecret('JWT_SECRET'), {
    algorithms: [JWT_ALGORITHM],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  }) as unknown as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, requireSecret('JWT_REFRESH_SECRET'), {
    algorithms: [JWT_ALGORITHM],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  }) as unknown as RefreshTokenPayload;
}

export function decodeRefreshTokenExpiry(token: string): Date {
  const decoded = jwt.decode(token) as { exp?: number };
  if (!decoded?.exp) {
    return new Date(0);
  }
  return new Date(decoded.exp * 1000);
}

export { hashToken, REFRESH_TOKEN_EXPIRY_DAYS };
