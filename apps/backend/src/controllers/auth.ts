import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import type { IUser } from '../models/User';

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('FATAL: JWT_SECRET is not defined');
    process.exit(1);
  }
  return secret;
})();

const JWT_REFRESH_SECRET = (() => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    console.error('FATAL: JWT_REFRESH_SECRET is not defined');
    process.exit(1);
  }
  return secret;
})();

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

function generateAccessToken(userId: string) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

function generateRefreshToken(userId: string) {
  return jwt.sign({ id: userId }, JWT_REFRESH_SECRET, { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` });
}

async function storeRefreshToken(token: string, userId: string) {
  const decoded = jwt.decode(token) as { exp?: number };
  const expiresAt = new Date((decoded.exp ?? 0) * 1000);

  await RefreshToken.create({ token, user: userId, expiresAt });
}

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
    $or: [
      { email: email.toLowerCase() },
      { username: username.toLowerCase() },
    ],
  });

  if (existingUser) {
    const field = existingUser.email === email.toLowerCase() ? 'Email' : 'Username';
    throw new AppError(`${field} already in use`, 409);
  }

  const salt = await bcrypt.genSalt(10);
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
  await storeRefreshToken(refreshToken, user._id as string);

  res.status(201).json({
    accessToken,
    refreshToken,
    user: userPayload(user),
  });
});

export const Login = asyncHandler(async (req: Request, res: Response) => {
  const { identifier, password } = req.body;

  const user = await User.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier.toLowerCase() },
    ],
  });

  if (!user || !user.hasPassword || !user.passwordHash) {
    throw new AppError('Invalid email/username or password', 401);
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError('Invalid email/username or password', 401);
  }

  const accessToken = generateAccessToken(user._id as string);
  const refreshToken = generateRefreshToken(user._id as string);
  await storeRefreshToken(refreshToken, user._id as string);

  res.status(200).json({
    accessToken,
    refreshToken,
    user: userPayload(user),
  });
});

export const Refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  let decoded: { id: string };
  try {
    decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { id: string };
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const storedToken = await RefreshToken.findOne({
    token: refreshToken,
    revoked: false,
  });

  if (!storedToken) {
    throw new AppError('Refresh token has been revoked', 401);
  }

  await RefreshToken.updateOne({ _id: storedToken._id }, { revoked: true });

  const newAccessToken = generateAccessToken(decoded.id);
  const newRefreshToken = generateRefreshToken(decoded.id);
  await storeRefreshToken(newRefreshToken, decoded.id);

  res.status(200).json({
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  });
});

export const Logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    await RefreshToken.updateOne({ token: refreshToken }, { revoked: true });
  }

  res.status(200).json({ message: 'Logged out successfully' });
});

export const Me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id).select('-passwordHash');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.status(200).json({ user: userPayload(user) });
});
