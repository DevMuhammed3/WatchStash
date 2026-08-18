import { z } from "zod"

const envValuaCheck = z.object({
  PORT: z.coerce.number().min(1),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  CORS_ORIGIN: z.string().min(1),
  FRONTEND_ORIGIN: z.string().min(1),
  OAUTH_STATE_SECRET: z.string().min(1),
});

export default envValuaCheck;
