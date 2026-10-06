import type { Types } from 'mongoose';
import { RefreshToken } from '../models/RefreshToken.js';
import {
  generateAccessToken,
  generateRefreshToken,
  decodeRefreshTokenExpiry,
  hashToken,
} from '../config/jwt.js';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenHash: string;
}

export async function issueTokens(userId: Types.ObjectId | string): Promise<IssuedTokens> {
  const accessToken = generateAccessToken(userId as string);
  const refreshToken = generateRefreshToken(userId as string);
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = decodeRefreshTokenExpiry(refreshToken);

  await RefreshToken.create({
    token: refreshTokenHash,
    user: userId,
    expiresAt,
  });

  return { accessToken, refreshToken, refreshTokenHash };
}
