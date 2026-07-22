import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import logger from './logger';

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    logger.fatal('JWT_SECRET is not defined in environment variables');
    process.exit(1);
  }
  return secret;
})();

const JWT_REFRESH_SECRET = (() => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    logger.fatal('JWT_REFRESH_SECRET is not defined in environment variables');
    process.exit(1);
  }
  return secret;
})();

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const JWT_ALGORITHM = 'HS256' as const;
const JWT_ISSUER = 'watchstash';
const JWT_AUDIENCE = 'watchstash-api';

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
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    algorithm: JWT_ALGORITHM,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ id: userId }, JWT_REFRESH_SECRET, {
    expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d`,
    algorithm: JWT_ALGORITHM,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, JWT_SECRET, {
    algorithms: [JWT_ALGORITHM],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  }) as unknown as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET, {
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

export { hashToken, JWT_SECRET, JWT_REFRESH_SECRET, REFRESH_TOKEN_EXPIRY_DAYS };
