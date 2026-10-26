import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { IUser } from '../models/User.js';
import { verifyRefreshToken, hashToken } from '../config/jwt.js';
import { issueTokens } from '../utils/issueTokens.js';
import {
  readRefreshToken,
  refreshTokenFromBody,
  setRefreshCookie,
  clearRefreshCookie,
} from '../utils/refreshCookie.js';

const BCRYPT_ROUNDS = 12;

// A rotated refresh token stays acceptable for this long after rotation so a
// double-submitted request (two tabs, or a response whose Set-Cookie never
// arrived) cannot lock the client out of its own session.
const ROTATION_GRACE_MS = 10_000;

function userPayload(user: IUser) {
  return {
    _id: user._id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    // Derive from the hash rather than the flag: accounts created before
    // `hasPassword` existed hydrate with the default `false` but still have a
    // password and must not be offered the OAuth-only "set a password" flow.
    hasPassword: Boolean(user.passwordHash),
    providers: {
      google: Boolean(user.providers?.googleId),
      github: Boolean(user.providers?.githubId),
      facebook: Boolean(user.providers?.facebookId),
      twitter: Boolean(user.providers?.twitterId),
    },
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

  const { accessToken, refreshToken } = await issueTokens(user._id);
  setRefreshCookie(res, refreshToken);

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

  if (!user || !user.passwordHash) {
    throw new AppError('Invalid email/username or password', 401);
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError('Invalid email/username or password', 401);
  }

  await RefreshToken.updateMany({ user: user._id, revoked: false }, { revoked: true });

  const { accessToken, refreshToken } = await issueTokens(user._id);
  setRefreshCookie(res, refreshToken);

  res.status(200).json({
    status: 'success',
    accessToken,
    refreshToken,
    user: userPayload(user),
  });
});

export const Refresh = asyncHandler(async (req: Request, res: Response) => {
  const presented = readRefreshToken(req);
  if (!presented) {
    throw new AppError('Refresh token is required', 401);
  }

  let decoded: { id: string };
  try {
    decoded = verifyRefreshToken(presented);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const tokenHash = hashToken(presented);

  let storedToken = await RefreshToken.findOneAndUpdate(
    { token: tokenHash, revoked: false, expiresAt: { $gt: new Date() } },
    { revoked: true, rotatedAt: new Date() },
    { new: true },
  );

  if (!storedToken) {
    // Grace window: the same token arriving twice in quick succession means
    // the first rotation's response may have been lost. Retire the token that
    // rotation issued so no orphaned copy outlives this response, then issue
    // a fresh pair below.
    const recent = await RefreshToken.findOne({
      token: tokenHash,
      revoked: true,
      rotatedAt: { $gte: new Date(Date.now() - ROTATION_GRACE_MS) },
      expiresAt: { $gt: new Date() },
    });

    if (!recent) {
      throw new AppError('Refresh token has been revoked or expired', 401);
    }

    storedToken = recent;
    if (storedToken.replacedBy) {
      await RefreshToken.updateOne(
        { token: storedToken.replacedBy, revoked: false },
        { revoked: true },
      );
    }
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    throw new AppError('User no longer exists', 401);
  }

  const { accessToken, refreshToken, refreshTokenHash } = await issueTokens(decoded.id);
  await RefreshToken.updateOne({ _id: storedToken._id }, { replacedBy: refreshTokenHash });
  setRefreshCookie(res, refreshToken);

  res.status(200).json({
    status: 'success',
    accessToken,
    // Echo the token only for clients that sent it in the body (legacy
    // localStorage flow). Cookie-based clients must never receive it, or XSS
    // could bypass the httpOnly cookie by calling /refresh itself.
    ...(refreshTokenFromBody(req) ? { refreshToken } : {}),
  });
});

export const Logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = readRefreshToken(req);

  if (refreshToken) {
    // The token hash is globally unique, so revoking by hash alone is enough
    // and keeps logout working for sessions whose access token already expired.
    const tokenHash = hashToken(refreshToken);
    await RefreshToken.updateOne({ token: tokenHash }, { revoked: true });
  }

  clearRefreshCookie(res);

  res.status(200).json({ status: 'success', message: 'Logged out successfully' });
});

export const Me = asyncHandler(async (req: Request, res: Response) => {
  // Keep `passwordHash` in the document so the payload can derive
  // `hasPassword` for accounts created before the flag existed; `userPayload`
  // never copies it into the response.
  const user = await User.findById(req.user!.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.status(200).json({ status: 'success', user: userPayload(user) });
});

export const UpdateMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const { displayName, username, bio, avatarUrl } = req.body as {
    displayName?: string;
    username?: string;
    bio?: string;
    avatarUrl?: string;
  };

  if (username && username !== user.username) {
    const taken = await User.exists({ username, _id: { $ne: user._id } });
    if (taken) {
      throw new AppError('Username already in use', 409);
    }
    user.username = username;
  }

  if (displayName !== undefined) user.displayName = displayName;
  if (bio !== undefined) user.bio = bio;
  if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

  await user.save();

  res.status(200).json({ status: 'success', user: userPayload(user) });
});

export const ChangePassword = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword: string;
  };

  // OAuth-only accounts have no password yet, so they may set one directly.
  // Accounts that already have one must prove they know it.
  const isSettingPassword = !user.passwordHash;
  if (user.passwordHash) {
    if (!currentPassword) {
      throw new AppError('Current password is required', 400);
    }
    if (!user.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new AppError('Current password is incorrect', 401);
    }
  }

  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
  user.passwordHash = await bcrypt.hash(newPassword, salt);
  user.hasPassword = true;
  await user.save();

  // A password change is a security event: retire every other session so a
  // stolen refresh token cannot outlive it, while keeping this browser signed in.
  const currentToken = readRefreshToken(req);
  const currentHash = currentToken ? hashToken(currentToken) : null;
  await RefreshToken.updateMany(
    currentHash
      ? { user: user._id, token: { $ne: currentHash } }
      : { user: user._id },
    { revoked: true },
  );

  res.status(200).json({
    status: 'success',
    message: isSettingPassword ? 'Password set successfully' : 'Password updated successfully',
    user: userPayload(user),
  });
});

export const LogoutOtherSessions = asyncHandler(async (req: Request, res: Response) => {
  const currentToken = readRefreshToken(req);
  const currentHash = currentToken ? hashToken(currentToken) : null;

  const result = await RefreshToken.updateMany(
    {
      user: req.user!.id,
      revoked: false,
      ...(currentHash ? { token: { $ne: currentHash } } : {}),
    },
    { revoked: true },
  );

  res.status(200).json({
    status: 'success',
    message: 'Other sessions signed out',
    revoked: result.modifiedCount,
  });
});

export const DeleteMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const { username } = req.body as { username: string };
  if (username.toLowerCase() !== user.username.toLowerCase()) {
    throw new AppError('Username does not match', 400);
  }

  // Document middleware on the User model cascades stash items, movies,
  // refresh tokens, and follows before the account row is removed.
  await user.deleteOne();
  clearRefreshCookie(res);

  res.status(200).json({ status: 'success', message: 'Account deleted' });
});
