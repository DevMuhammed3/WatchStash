import { Router } from 'express';
import {
  searchMedia,
  trendingMedia,
  mediaDetails,
  getStashItems,
  createStashFromProvider,
  updateStashItem,
  deleteStashItem,
} from '../controllers/media.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createRateLimit } from '../config/upstash.js';
import { searchTmdbQuerySchema, trendingQuerySchema, stashItemBodySchema, updateStashItemSchema } from '../validations/media.js';

export const mediaRouter: Router = Router();
export const stashRouter: Router = Router();

mediaRouter.use(authenticate);
stashRouter.use(authenticate);

const mediaReadLimiter = createRateLimit({ id: 'user', limit: 100, window: '15 m', prefix: 'rl:media' });
const stashReadLimiter = createRateLimit({ id: 'user', limit: 100, window: '15 m', prefix: 'rl:stash:read' });
const stashWriteLimiter = createRateLimit({ id: 'user', limit: 100, window: '15 m', prefix: 'rl:stash:write' });

mediaRouter.get('/search', mediaReadLimiter, validate(searchTmdbQuerySchema, 'query'), searchMedia);
mediaRouter.get('/trending', mediaReadLimiter, validate(trendingQuerySchema, 'query'), trendingMedia);
mediaRouter.get('/details/:provider/:id', mediaReadLimiter, mediaDetails);

stashRouter.get('/', stashReadLimiter, getStashItems);
stashRouter.post('/from-provider', stashWriteLimiter, validate(stashItemBodySchema), createStashFromProvider);
stashRouter.patch('/:id', stashWriteLimiter, validate(updateStashItemSchema), updateStashItem);
stashRouter.delete('/:id', stashWriteLimiter, deleteStashItem);
