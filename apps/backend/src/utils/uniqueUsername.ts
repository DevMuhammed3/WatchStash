import crypto from 'crypto';
import { User } from '../models/User.js';

export function slugifyUsername(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 30) || 'user'
  );
}

export async function findUniqueUsername(base: string): Promise<string> {
  const root = slugifyUsername(base);

  if (!(await User.exists({ username: root }))) {
    return root;
  }

  for (let i = 2; i <= 100; i++) {
    const candidate = `${root}_${i}`.slice(0, 30);
    if (!(await User.exists({ username: candidate }))) {
      return candidate;
    }
  }

  return `${root}_${crypto.randomBytes(4).toString('hex')}`.slice(0, 30);
}
