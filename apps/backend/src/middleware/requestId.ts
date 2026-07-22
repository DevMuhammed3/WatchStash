import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const MAX_REQUEST_ID_LENGTH = 64;

export function requestId(req: Request, res: Response, next: NextFunction) {
  const raw = req.headers['x-request-id'];
  const id =
    typeof raw === 'string' && raw.length > 0 && raw.length <= MAX_REQUEST_ID_LENGTH
      ? raw
      : crypto.randomUUID();
  req.headers['x-request-id'] = id;
  res.setHeader('X-Request-Id', id);
  next();
}
