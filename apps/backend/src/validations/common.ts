import { z } from 'zod';

/** Mongo ObjectId, used by the stash and movie routes. */
export const objectIdSchema = z
  .string()
  .regex(/^[a-f0-9]{24}$/i, 'Invalid ID format');

/**
 * Shared page/limit validation for list endpoints. The parsed values are
 * numbers, so controllers no longer need to parseInt() untrusted input.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});
