import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import mongoose from 'mongoose';
import authRoutes from '../routes/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { issueTokens } from '../utils/issueTokens.js';
import { testDatabaseUri, TEST_DATABASE_NAME } from './helpers/testDatabaseUri.js';

// Bare app: the production auth limiter uses shared Upstash Redis, which tests
// must not consume.
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use(errorHandler);

const suffix = Date.now().toString(36);
const username = `settings${suffix}`;
const email = `${username}@example.com`;

describe('Account settings', () => {
  let accessToken = '';
  let userId = '';

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret';
    await mongoose.connect(testDatabaseUri());
    await User.init();
    await RefreshToken.init();

    const res = await request(app).post('/api/auth/register').send({
      username,
      displayName: 'Settings User',
      email,
      password: 'Password1',
    });

    expect(res.status).toBe(201);
    accessToken = res.body.accessToken;
    userId = res.body.user._id;
  });

  afterAll(async () => {
    if (mongoose.connection.db?.databaseName === TEST_DATABASE_NAME) {
      await User.deleteMany({ username: { $regex: `^${username}` } });
      await RefreshToken.deleteMany({ user: { $exists: true } });
    }
    await mongoose.connection.close();
  });

  test('profile payload includes security metadata', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.hasPassword).toBe(true);
    expect(res.body.user.providers).toEqual({
      google: false,
      github: false,
      facebook: false,
      twitter: false,
    });
  });

  test('updates display name, username, bio, and avatar', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        displayName: 'Updated Name',
        username: `${username}_x`,
        bio: 'A short bio',
        avatarUrl: 'https://example.com/avatar.png',
      });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      displayName: 'Updated Name',
      username: `${username}_x`,
      bio: 'A short bio',
      avatarUrl: 'https://example.com/avatar.png',
    });
  });

  test('rejects invalid profile fields', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ username: 'Not Valid!' });

    expect(res.status).toBe(400);
  });

  test('rejects a username that is already in use', async () => {
    await User.create({
      username: `${username}_taken`,
      displayName: 'Taken',
      email: `${username}_taken@example.com`,
      hasPassword: false,
    });

    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ username: `${username}_taken` });

    expect(res.status).toBe(409);
  });

  test('requires the current password before changing it', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ newPassword: 'Password2' });

    expect(res.status).toBe(400);
  });

  test('changes the password and invalidates the old one', async () => {
    const wrong = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'WrongPass1', newPassword: 'Password2' });
    expect(wrong.status).toBe(401);

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'Password1', newPassword: 'Password2' });
    expect(res.status).toBe(200);
    expect(res.body.user.hasPassword).toBe(true);
    expect(res.body.user.passwordHash).toBeUndefined();

    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({ identifier: `${username}_x`, password: 'Password1' });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ identifier: `${username}_x`, password: 'Password2' });
    expect(newLogin.status).toBe(200);
  });

  test('lets an OAuth-only account set a password without the current one', async () => {
    const oauthUser = await User.create({
      username: `${username}_oauth`,
      displayName: 'OAuth Only',
      email: `${username}_oauth@example.com`,
      hasPassword: false,
    });
    const { accessToken: oauthToken } = await issueTokens(oauthUser._id);

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${oauthToken}`)
      .send({ newPassword: 'Password3' });

    expect(res.status).toBe(200);
    expect(res.body.user.hasPassword).toBe(true);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ identifier: `${username}_oauth`, password: 'Password3' });
    expect(login.status).toBe(200);
  });

  test('reports hasPassword for accounts created before the flag existed', async () => {
    // Accounts from before the flag was added hydrate with the model default
    // (`false`) despite having a password hash; they must not be treated as
    // OAuth-only.
    const legacy = await User.create({
      username: `${username}_legacy`,
      displayName: 'Legacy',
      email: `${username}_legacy@example.com`,
      passwordHash: 'hash',
    });
    const { accessToken: legacyToken } = await issueTokens(legacy._id);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${legacyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.hasPassword).toBe(true);
  });

  test('signs out other sessions', async () => {
    const res = await request(app)
      .post('/api/auth/logout-others')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
  });

  test('rejects deletion when the username does not match', async () => {
    const res = await request(app)
      .delete('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ username: 'someone-else' });

    expect(res.status).toBe(400);
  });

  test('deletes the account and its storage', async () => {
    const res = await request(app)
      .delete('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ username: `${username}_x` });

    expect(res.status).toBe(200);

    const user = await User.findOne({ username: `${username}_x` });
    expect(user).toBeNull();

    const tokens = await RefreshToken.countDocuments({ user: userId });
    expect(tokens).toBe(0);
  });
});
