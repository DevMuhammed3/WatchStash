// apps/backend/src/config/db.ts
import mongoose from 'mongoose';
import logger from './logger';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalForMongoose = globalThis as typeof globalThis & {
  __watchstashMongoose?: MongooseCache;
};

const cached: MongooseCache = (globalForMongoose.__watchstashMongoose ??= {
  conn: null,
  promise: null,
});

export const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    throw new Error('MONGODB_URI is missing');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongoURI);
  }

  try {
    cached.conn = await cached.promise;
    logger.info(`MongoDB Connected: ${cached.conn.connection.host}`);
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    logger.error(`Error connecting to MongoDB: ${(error as Error).message}`);
    throw error;
  }
};
