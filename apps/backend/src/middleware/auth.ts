import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError';

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('FATAL: JWT_SECRET is not defined in environment variables');
    process.exit(1);
  }
  return secret;
})();

export interface AuthPayload {
  id: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    next(new AppError('Authentication required', 401));
    return;
  }

  const token = header.split(' ')[1]!;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as AuthPayload;
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    if ((err as Error).name === 'TokenExpiredError') {
      next(new AppError('Token expired', 401));
      return;
    }
    next(new AppError('Invalid token', 401));
  }
}
