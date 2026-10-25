// apps/backend/index.ts
// Entrypoint for Vercel's native Express preset. The preset hands `index.ts` to
// @vercel/node, which invokes the exported value as a (req, res) handler; an
// Express app instance satisfies that contract, so no wrapper is needed.
import express from 'express';
import App from './src/app.js';
import envValuaCheck from './src/config/env.js';

envValuaCheck.parse(process.env);

const app: express.Express = App();

export default app;

// The connection is opened lazily by the API middleware on the first request.
// Starting it during module evaluation does not help on Vercel: the runtime
// does not drive that promise until a request arrives, so the instance just
// sits in "connecting" and buffers commands. A lazy connect finishes in about
// a second and the caller waits for it explicitly.
