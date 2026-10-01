// apps/backend/src/index.ts
import App from './app.js';
import mongoose from 'mongoose';
import logger from './config/logger.js';
import envValuaCheck from './config/env.js';
import { connectDB } from './config/db.js';

const env = envValuaCheck.parse(process.env);

const app = App();

await connectDB();

const server = app.listen(env.PORT, () => {
  logger.info(`WatchStash Backend running on http://localhost:${env.PORT}`);
});

async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  server.close(async () => {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed.');
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
