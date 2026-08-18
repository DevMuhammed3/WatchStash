// apps/backend/src/index.ts
import App from "./app"
import mongoose from 'mongoose';
import logger from './config/logger';
import envValuaCheck from './config/env';
import { connectDB } from './config/db';


const env = envValuaCheck.parse(process.env);

const app = App();
const PORT = env.PORT;

await connectDB();

const server = app.listen(PORT, '127.0.0.1', () => {
  logger.info(`WatchStash Backend running on http://localhost:${PORT}`);
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

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
