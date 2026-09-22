import { z } from 'zod';
import { STATUS_ORDER } from '@watchstash/types';

export const searchTmdbQuerySchema = z.object({
  query: z.string().trim().min(1, 'Search query is required').max(200),
  page: z.coerce.number().int().min(1).max(500).optional().default(1),
});

export const trendingQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(500).optional().default(1),
});

export const stashItemBodySchema = z.object({
  provider: z.enum(['tmdb']),
  externalId: z.string().trim().min(1),
  type: z.enum(['movie', 'series', 'anime']),
  status: z.enum(STATUS_ORDER).optional(),
  rating: z.number().int().min(1).max(10).optional(),
  review: z.string().trim().max(5000).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(50).optional(),
  progress: z
    .object({
      currentEpisode: z.number().int().min(0).optional(),
      totalEpisodes: z.number().int().min(1).optional(),
      currentSeason: z.number().int().min(1).optional(),
    })
    .optional(),
});

export const updateStashItemSchema = z
  .object({
    status: z.enum(STATUS_ORDER).optional(),
    rating: z.number().int().min(1).max(10).optional(),
    review: z.string().trim().max(5000).optional(),
    tags: z.array(z.string().trim().min(1).max(50)).max(50).optional(),
    progress: z
      .object({
        currentEpisode: z.number().int().min(0).optional(),
        totalEpisodes: z.number().int().min(1).optional(),
        currentSeason: z.number().int().min(1).optional(),
      })
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });