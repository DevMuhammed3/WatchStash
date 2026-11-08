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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function findUniqueUsername(base: string): Promise<string> {
  const root = slugifyUsername(base);

  // Leave room for `_NN` when the base already sits at the 30-character limit;
  // otherwise truncation would return the taken base again.
  const suffixRoot = root.length > 27 ? root.slice(0, 27) : root;

  // One query fetches every username that could collide with this base plus a
  // numeric suffix (`root`, `root_2`, ...). Suffix selection then happens in
  // memory instead of one `exists()` round-trip per candidate.
  const pattern =
    suffixRoot === root
      ? `^${escapeRegExp(root)}(?:_[0-9]+)?$`
      : `^(?:${escapeRegExp(root)}|${escapeRegExp(suffixRoot)}_[0-9]+)$`;
  const existing = await User.find(
    { username: new RegExp(pattern) },
    { username: 1, _id: 0 },
  ).lean();
  const taken = new Set(existing.map((user) => user.username));

  if (!taken.has(root)) {
    return root;
  }

  for (let i = 2; i <= 100; i++) {
    const candidate = `${suffixRoot}_${i}`;
    if (!taken.has(candidate)) {
      return candidate;
    }
  }

  return `${suffixRoot}_${crypto.randomBytes(4).toString('hex')}`.slice(0, 30);
}
