import type { Types } from 'mongoose';
import { RefreshToken } from '../models/RefreshToken';
import {
  generateAccessToken,
  generateRefreshToken,
  decodeRefreshTokenExpiry,
  hashToken,
} from '../config/jwt';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

export async function issueTokens(userId: Types.ObjectId | string): Promise<IssuedTokens> {
  const accessToken = generateAccessToken(userId as string);
  const refreshToken = generateRefreshToken(userId as string);
  const expiresAt = decodeRefreshTokenExpiry(refreshToken);

  await RefreshToken.create({
    token: hashToken(refreshToken),
    user: userId,
    expiresAt,
  });

  return { accessToken, refreshToken };
}
