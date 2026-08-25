import { describe, test, expect, afterAll, beforeAll } from 'bun:test';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';

const MONGODB_URI =
  process.env.OAUTH_TEST_MONGODB_URI || 'mongodb://localhost:27017/watchstash_oauth_test';

process.env.MONGODB_URI = MONGODB_URI;

describe('connectDB', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    await mongoose.connect(MONGODB_URI);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('returns the existing connection without opening a new one', async () => {
    const first = await connectDB();
    const second = await connectDB();

    expect(second).toBe(first);
    expect(second.connection.readyState).toBe(1);
  });

  test('throws when MONGODB_URI is missing', async () => {
    const originalUri = process.env.MONGODB_URI;
    delete process.env.MONGODB_URI;

    try {
      await expect(connectDB()).rejects.toThrow('MONGODB_URI is missing');
    } finally {
      if (originalUri === undefined) {
        delete process.env.MONGODB_URI;
      } else {
        process.env.MONGODB_URI = originalUri;
      }
    }
  });
});
