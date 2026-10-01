// apps/backend/index.ts
// Entrypoint for Vercel's native Express preset. The preset hands `index.ts` to
// @vercel/node, which invokes the exported value as a (req, res) handler; an
// Express app instance satisfies that contract, so no wrapper is needed.
import express from 'express';
import App from './src/app.js';
import envValuaCheck from './src/config/env.js';
import { connectDB } from './src/config/db.js';
import logger from './src/config/logger.js';

envValuaCheck.parse(process.env);

const app: express.Express = App();

export default app;

// Mongoose buffers commands until the connection is ready, so a slow or
// unreachable database degrades /health to 503 rather than failing to boot.
void connectDB().catch((error: unknown) => {
  logger.error(`MongoDB connection failed: ${(error as Error).message}`);
});