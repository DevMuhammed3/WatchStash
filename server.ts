import type { IncomingMessage, ServerResponse } from 'node:http';
import App from './apps/backend/src/app';
import envValuaCheck from './apps/backend/src/config/env';
import logger from './apps/backend/src/config/logger';
import { connectDB } from './apps/backend/src/config/db';

envValuaCheck.parse(process.env);

const app = App();

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    await connectDB();
  } catch (error) {
    logger.error(`MongoDB unavailable: ${(error as Error).message}`);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'error', message: 'Database unavailable' }));
    return;
  }

  (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
