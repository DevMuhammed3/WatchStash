// apps/backend/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'mongo-sanitize';
import pinoHttp from 'pino-http';
import mongoose from 'mongoose';
import { connectDB } from './config/db';
import authRoutes from './routes/auth';
import { errorHandler } from './middleware/errorHandler';
import logger from './config/logger';
import { requestId } from './middleware/requestId';

const app = express();
const PORT = process.env.PORT || 3001;

connectDB();

app.use(requestId);
app.use(pinoHttp({ logger }));
app.use(helmet());

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many requests, please try again later' },
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many auth attempts, please try again later' },
});
app.use('/api/auth', authLimiter);

app.use(express.json({ limit: '10kb' }));

app.use((req, _res, next) => {
  if (req.body) {
    (req as any).body = mongoSanitize(req.body);
  }
  
  if (req.query) {
    const cleanQuery = mongoSanitize(req.query);
    Object.keys(req.query).forEach(key => delete req.query[key]);
    Object.assign(req.query, cleanQuery);
  }

  if (req.params) {
    const cleanParams = mongoSanitize(req.params);
    Object.keys(req.params).forEach(key => delete req.params[key]);
    Object.assign(req.params, cleanParams);
  }
  
  next();
});

app.get('/', (_req, res) => {
  res.json({ message: 'WatchStash API is up and running!' });
});

app.get('/health', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const isHealthy = dbState === 1;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    mongodb: isHealthy ? 'connected' : 'disconnected',
    uptime: process.uptime(),
  });
});

app.use('/api/auth', authRoutes);

app.use(errorHandler);

const server = app.listen(PORT, () => {
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
