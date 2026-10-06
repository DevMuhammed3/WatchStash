/**
 * `bun test` loads .env, so process.env.MONGODB_URI is the database the dev
 * server uses. Any suite that deletes documents must not connect there —
 * derive a dedicated `watchstash_test` database from it instead, or point
 * MONGODB_TEST_URI at your own scratch database.
 */
export function testDatabaseUri(): string {
  if (process.env.MONGODB_TEST_URI) return process.env.MONGODB_TEST_URI;

  const uri = process.env.MONGODB_URI;
  if (!uri) return 'mongodb://localhost:27017/watchstash_test';

  const [base, query] = uri.split('?');
  const authorityEnd = base.lastIndexOf('@');
  const lastSlash = base.lastIndexOf('/');
  // A URI like `mongodb+srv://user:pass@host/?...` has no database path at
  // all, while `...host/existing_db` has to have that name replaced.
  const withoutDatabase =
    lastSlash > authorityEnd ? base.slice(0, lastSlash) : base.replace(/\/$/, '');
  return `${withoutDatabase}/watchstash_test${query ? `?${query}` : ''}`;
}

export const TEST_DATABASE_NAME = 'watchstash_test';
