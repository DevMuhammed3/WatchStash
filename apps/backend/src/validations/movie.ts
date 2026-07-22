import { z } from 'zod';

export const createMovieSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional().default(''),
  releaseYear: z.number().int().min(1888).max(2100).optional(),
  genre: z.array(z.string().max(50)).max(10).optional().default([]),
  watched: z.boolean().optional().default(false),
});
