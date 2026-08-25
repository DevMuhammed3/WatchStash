import { z } from "zod"

const envValuaCheck = z.object({
  PORT: z.coerce.number().min(1).default(3001),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  CORS_ORIGIN: z.url(),
  FRONTEND_ORIGIN: z.url(),
  OAUTH_STATE_SECRET: z.string().min(1),
});

export default envValuaCheck;
