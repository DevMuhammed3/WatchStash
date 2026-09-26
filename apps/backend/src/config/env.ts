import { z } from "zod"

const envValuaCheck = z.object({
  PORT: z.coerce.number().min(1).default(3001),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  CORS_ORIGIN: z.url(),
  FRONTEND_ORIGIN: z.url(),
  OAUTH_STATE_SECRET: z.string().min(1),
  TMDB_ACCESS_TOKEN: z.string().default(''),
  TMDB_API_KEY: z.string().default(''),
  UPSTASH_REDIS_REST_URL: z.string().default(''),
  UPSTASH_REDIS_REST_TOKEN: z.string().default(''),
});

export default envValuaCheck;
