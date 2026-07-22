import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import type { IUser } from '../models/User';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  decodeRefreshTokenExpiry,
  hashToken,
} from '../config/jwt';

const BCRYPT_ROUNDS = 12;

function userPayload(user: IUser) {
  return {
    id: user._id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
  };
}

export const Register = asyncHandler(async (req: Request, res: Response) => {
  const { username, displayName, email, password } = req.body;

  const existingUser = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
  });

  if (existingUser) {
    const field = existingUser.email === email.toLowerCase() ? 'Email' : 'Username';
    throw new AppError(`${field} already in use`, 409);
  }

  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await User.create({
    username,
    displayName,
    email,
    passwordHash,
    hasPassword: true,
  });

  const accessToken = generateAccessToken(user._id as string);
  const refreshToken = generateRefreshToken(user._id as string);
  const expiresAt = decodeRefreshTokenExpiry(refreshToken);

  await RefreshToken.create({
    token: hashToken(refreshToken),
    user: user._id,
    expiresAt,
  });

  res.status(201).json({
    status: 'success',
    accessToken,
    refreshToken,
    user: userPayload(user),
  });
});

export const Login = asyncHandler(async (req: Request, res: Response) => {
  const { identifier, password } = req.body;

  const user = await User.findOne({
    $or: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }],
  });

  if (!user || !user.hasPassword || !user.passwordHash) {
    throw new AppError('Invalid email/username or password', 401);
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError('Invalid email/username or password', 401);
  }

  await RefreshToken.updateMany({ user: user._id, revoked: false }, { revoked: true });

  const accessToken = generateAccessToken(user._id as string);
  const refreshToken = generateRefreshToken(user._id as string);
  const expiresAt = decodeRefreshTokenExpiry(refreshToken);

  await RefreshToken.create({
    token: hashToken(refreshToken),
    user: user._id,
    expiresAt,
  });

  res.status(200).json({
    status: 'success',
    accessToken,
    refreshToken,
    user: userPayload(user),
  });
});

export const Refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  let decoded: { id: string };
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const tokenHash = hashToken(refreshToken);

  const storedToken = await RefreshToken.findOneAndUpdate(
    { token: tokenHash, revoked: false, expiresAt: { $gt: new Date() } },
    { revoked: true },
    { new: true },
  );

  if (!storedToken) {
    throw new AppError('Refresh token has been revoked or expired', 401);
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    throw new AppError('User no longer exists', 401);
  }

  const newAccessToken = generateAccessToken(decoded.id);
  const newRefreshToken = generateRefreshToken(decoded.id);
  const expiresAt = decodeRefreshTokenExpiry(newRefreshToken);

  await RefreshToken.create({
    token: hashToken(newRefreshToken),
    user: decoded.id,
    expiresAt,
  });

  res.status(200).json({
    status: 'success',
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  });
});

export const Logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    await RefreshToken.updateOne({ token: tokenHash, user: req.user!.id }, { revoked: true });
  }

  res.status(200).json({ status: 'success', message: 'Logged out successfully' });
});

export const Me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id).select('-passwordHash');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.status(200).json({ status: 'success', user: userPayload(user) });
});
