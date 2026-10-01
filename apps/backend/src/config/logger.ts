import pino from 'pino';

// pino-pretty spawns worker threads, which are unavailable in serverless
// functions. Gate it on an explicit opt-in instead of NODE_ENV.
const usePretty = process.env.LOG_PRETTY === 'true' && !process.env.VERCEL;

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: usePretty ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'req.query.code', 'req.query.state'],
  },
});

export default logger;
