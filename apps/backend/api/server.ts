import type { IncomingMessage, ServerResponse } from 'node:http';
import crypto from 'node:crypto';
import App from '../src/app.js';
import envValuaCheck from '../src/config/env.js';
import logger from '../src/config/logger.js';
import { connectDB } from '../src/config/db.js';
import { verifyState } from '../src/utils/oauthState.js';

envValuaCheck.parse(process.env);

const app = App();

function respondJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const rawUrl = req.url ?? '/';
  const url = new URL(rawUrl, `http://${req.headers.host ?? 'localhost'}`);

  if (url.searchParams.has('__probe')) {
    const secret = process.env.OAUTH_STATE_SECRET ?? '';
    const probeState = url.searchParams.get('__state');
    respondJson(res, 200, {
      secretFingerprint: crypto.createHash('sha256').update(secret).digest('hex').slice(0, 10),
      stateSignatureValid: probeState ? verifyState(probeState, 'google') : null,
      serverTime: Date.now(),
    });
    return;
  }

  Object.defineProperty(req, 'query', {
    get() {
      const u = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
      return Object.fromEntries(u.searchParams);
    },
    configurable: true,
  });

  try {
    await connectDB();
  } catch (error) {
    logger.error(`MongoDB unavailable: ${(error as Error).message}`);
    respondJson(res, 503, { status: 'error', message: 'Database unavailable' });
    return;
  }

  (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
