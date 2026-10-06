import express, { type Express, type RequestHandler } from "express";
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'mongo-sanitize';
import pinoHttp from 'pino-http';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import oauthRoutes from './routes/oauth.js';
import movieRoutes from './routes/movie.js';
import { mediaRouter, stashRouter } from './routes/media.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createRateLimit } from './config/upstash.js';
import logger from './config/logger.js';
import { requestId } from './middleware/requestId.js';

const pinoMiddleware = (pinoHttp as any)({ logger }) as RequestHandler;

export default function App(): Express {
  const app = express();
  app.set("trust proxy", 1);

  const globalLimiter = createRateLimit({ id: 'ip', limit: 100, window: '15 m', prefix: 'rl:global' });
  const authLimiter = createRateLimit({ id: 'ip', limit: 20, window: '15 m', prefix: 'rl:auth' });

  app.use(requestId);
  app.use(pinoMiddleware);
  // Cast: helmet's `exports` map has no `types` condition, so TypeScript falls
  // back to the CJS declaration file and types the default import as the module
  // namespace instead of a middleware factory. Runtime behaviour is unaffected.
  app.use((helmet as unknown as () => RequestHandler)());

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN,
      credentials: true,
    }),
  );

  app.get('/health', (_req, res) => {
    const dbState = mongoose.connection.readyState;
    const isHealthy = dbState === 1;

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'ok' : 'degraded',
      mongodb: isHealthy ? 'connected' : 'disconnected',
      uptime: process.uptime(),
    });
  });

  app.use(globalLimiter);
  app.use('/api/auth', authLimiter);

  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());

  app.use((req, _res, next) => {
    if (req.body) {
      (req as any).body = mongoSanitize(req.body);
    }

    if (req.query) {
      const cleanQuery = mongoSanitize(req.query);
      Object.keys(req.query).forEach((key) => delete req.query[key]);
      Object.assign(req.query, cleanQuery);
    }

    next();
  });

  app.get('/', (_req, res) => {
    res.status(200).json({
      status: 'success',
      message: 'WatchStash API is up and running!',
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/auth/oauth', oauthRoutes);
  app.use('/api/movies', movieRoutes);
  app.use('/api/media', mediaRouter);
  app.use('/api/stash', stashRouter);

  app.use(errorHandler);

  return app;
}
