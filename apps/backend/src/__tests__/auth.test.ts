import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { Follow } from '../models/Follow';
import { Movie } from '../models/Movie';
import { StashItem } from '../models/StashItem';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/watchstash_test';
const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret';

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = JWT_REFRESH_SECRET;
  await mongoose.connect(MONGODB_URI);
});

afterAll(async () => {
  await User.deleteMany({});
  await RefreshToken.deleteMany({});
  await Follow.deleteMany({});
  await Movie.deleteMany({});
  await StashItem.deleteMany({});
  await mongoose.connection.close();
});

describe('User Model', () => {
  test('should create a user with valid data', async () => {
    const user = await User.create({
      username: 'testuser',
      displayName: 'Test User',
      email: 'test@example.com',
      passwordHash: await bcrypt.hash('Password1', 10),
      hasPassword: true,
    });

    expect(user._id).toBeDefined();
    expect(user.username).toBe('testuser');
    expect(user.email).toBe('test@example.com');
    expect(user.hasPassword).toBe(true);
    expect(user.followersCount).toBe(0);
    expect(user.followingCount).toBe(0);
  });

  test('should fail to create user without required fields', async () => {
    try {
      await User.create({ username: 'incomplete' });
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeDefined();
    }
  });

  test('should enforce unique username', async () => {
    try {
      await User.create({
        username: 'testuser',
        displayName: 'Duplicate',
        email: 'other@example.com',
        hasPassword: false,
      });
      expect(true).toBe(false);
    } catch (err) {
      expect((err as any).code).toBe(11000);
    }
  });

  test('should enforce unique email', async () => {
    try {
      await User.create({
        username: 'uniqueuser',
        displayName: 'Unique',
        email: 'test@example.com',
        hasPassword: false,
      });
      expect(true).toBe(false);
    } catch (err) {
      expect((err as any).code).toBe(11000);
    }
  });
});

describe('RefreshToken Model', () => {
  test('should create a refresh token', async () => {
    const user = await User.create({
      username: 'tokenuser',
      displayName: 'Token User',
      email: 'token@example.com',
      hasPassword: false,
    });

    const token = jwt.sign({ id: user._id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const refreshToken = await RefreshToken.create({
      token,
      user: user._id,
      expiresAt,
    });

    expect(refreshToken._id).toBeDefined();
    expect(refreshToken.revoked).toBe(false);
    expect(refreshToken.user.toString()).toBe((user._id as mongoose.Types.ObjectId).toString());
  });

  test('should revoke a refresh token', async () => {
    const stored = await RefreshToken.findOne({ revoked: false });
    expect(stored).toBeDefined();

    await RefreshToken.updateOne({ _id: stored!._id }, { revoked: true });
    const updated = await RefreshToken.findById(stored!._id);
    expect(updated!.revoked).toBe(true);
  });
});

describe('JWT Utils', () => {
  test('should generate and verify access token', () => {
    const payload = { id: new mongoose.Types.ObjectId().toString() };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    expect(decoded.id).toBe(payload.id);
  });

  test('should reject invalid token', () => {
    expect(() => jwt.verify('invalid_token', JWT_SECRET)).toThrow();
  });

  test('should reject token with wrong secret', () => {
    const payload = { id: '123' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });

    expect(() => jwt.verify(token, 'wrong_secret')).toThrow();
  });
});

describe('Follow Model', () => {
  test('should create a follow relationship', async () => {
    const follower = await User.create({
      username: 'follower1',
      displayName: 'Follower One',
      email: 'follower1@example.com',
      hasPassword: false,
    });

    const following = await User.create({
      username: 'following1',
      displayName: 'Following One',
      email: 'following1@example.com',
      hasPassword: false,
    });

    const follow = await Follow.create({
      follower: follower._id,
      following: following._id,
    });

    expect(follow._id).toBeDefined();
    expect(follow.follower.toString()).toBe((follower._id as mongoose.Types.ObjectId).toString());
    expect(follow.following.toString()).toBe((following._id as mongoose.Types.ObjectId).toString());
  });

  test('should enforce unique follow pairs', async () => {
    const follower = await User.findOne({ username: 'follower1' });
    const following = await User.findOne({ username: 'following1' });

    try {
      await Follow.create({
        follower: follower!._id,
        following: following!._id,
      });
      expect(true).toBe(false);
    } catch (err) {
      expect((err as any).code).toBe(11000);
    }
  });
});
