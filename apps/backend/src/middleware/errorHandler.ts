import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import logger from '../config/logger';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const reqId = req.headers['x-request-id'];

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  if (err.name === 'ValidationError') {
    const messages = Object.values((err as any).errors).map((e: any) => e.message);
    res.status(400).json({ status: 'error', message: messages.join(', ') });
    return;
  }

  if (err.name === 'CastError') {
    res.status(400).json({ status: 'error', message: 'Invalid ID format' });
    return;
  }

  if ((err as any).code === 11000) {
    const field = Object.keys((err as any).keyValue)[0];
    res.status(409).json({ status: 'error', message: `${field} already in use` });
    return;
  }

  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({ status: 'error', message: 'Invalid token' });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({ status: 'error', message: 'Token expired' });
    return;
  }

  logger.error({ err, reqId, method: req.method, url: req.originalUrl }, 'Unhandled error');
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
}
