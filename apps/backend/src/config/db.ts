// apps/backend/src/config/db.ts
import mongoose from 'mongoose';
import logger from './logger.js';

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

// Serverless functions are short-lived and many instances can run at once, so
// keep the pool small and time the connection out quickly. The defaults (100
// sockets, 30s server selection) let a single cold start hold a request for
// 30s+ and then fail with a generic 500 instead of a clear 503.
const CONNECT_OPTIONS: mongoose.ConnectOptions = {
  serverSelectionTimeoutMS: 8000,
  connectTimeoutMS: 8000,
  socketTimeoutMS: 45000,
  maxPoolSize: 5,
  minPoolSize: 0,
  maxIdleTimeMS: 60000,
};

function resetCache() {
  cached.conn = null;
  cached.promise = null;
}

// Without this, a dropped connection leaves `cached.conn` populated, so later
// invocations on the same instance would keep returning a dead handle.
mongoose.connection.on('disconnected', resetCache);
mongoose.connection.on('error', resetCache);

export const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    throw new Error('MONGODB_URI is missing');
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongoURI, CONNECT_OPTIONS);
  }

  try {
    cached.conn = await cached.promise;
    logger.info(`MongoDB Connected: ${cached.conn.connection.host}`);
    return cached.conn;
  } catch (error) {
    resetCache();
    logger.error(`Error connecting to MongoDB: ${(error as Error).message}`);
    throw error;
  }
};
