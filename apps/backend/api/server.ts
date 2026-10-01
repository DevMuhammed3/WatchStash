import App from "../src/app.js";
import { connectDB } from "../src/config/db.js";
import mongoose from "mongoose";
import logger from "../src/config/logger.js";
import envValuaCheck from "../src/config/env.js";

const env = envValuaCheck.parse(process.env);

const app = App();
await connectDB();

export default app;
