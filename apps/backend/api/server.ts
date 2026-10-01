import App from "../src/app.js";
import envValuaCheck from "../src/config/env.js";
import { connectDB } from "../src/config/db.js";

envValuaCheck.parse(process.env);

const app = App();

export default async function handler(req: any, res: any) {
  await connectDB();
  app(req, res);
}
