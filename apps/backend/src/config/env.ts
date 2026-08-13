import { z } from "zod"

const envValuaCheck = z.object({
  PORT: z.string(),
  MONGODB_URI: z.string(),
  JWT_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  CORS_ORIGIN: z.string(),
  FRONTEND_ORIGIN: z.string(),
  OAUTH_STATE_SECRET: z.string().min(1),
});

export default envValuaCheck;
