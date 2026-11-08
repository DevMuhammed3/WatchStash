/**
 * Reports stash items that would collide with the unique index
 * `{ userId, provider, externalId, type }`.
 *
 * Read-only: this script never deletes or modifies anything.
 *
 * Run from apps/backend:
 *   bun run scripts/find-stash-duplicates.ts
 *
 * Uses its own connection with autoIndex disabled so importing/connecting for
 * the report cannot trigger an index build that fails on the very duplicates
 * we are trying to find. Exits with code 1 when duplicates exist so it can be
 * used as a pre-deploy gate.
 */
import mongoose from 'mongoose';

const COLLECTION = 'stashitems';

interface DuplicateGroup {
  _id: {
    userId: mongoose.Types.ObjectId;
    provider: string | null;
    externalId: string | null;
    type: string;
  };
  count: number;
  ids: mongoose.Types.ObjectId[];
  titles: string[];
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set (check apps/backend/.env).');
    process.exit(2);
  }

  const connection = mongoose.createConnection(uri, { autoIndex: false });
  try {
    await connection.asPromise();
    const collection = connection.collection(COLLECTION);

    const groups = (await collection
      .aggregate([
        {
          $group: {
            _id: {
              userId: '$userId',
              // Missing fields become null, matching how MongoDB treats them
              // in a unique compound index.
              provider: { $ifNull: ['$provider', null] },
              externalId: { $ifNull: ['$externalId', null] },
              type: '$type',
            },
            count: { $sum: 1 },
            ids: { $push: '$_id' },
            titles: { $push: '$title' },
          },
        },
        { $match: { count: { $gt: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray()) as DuplicateGroup[];

    if (groups.length === 0) {
      console.log('No duplicate stash items found. It is safe to build the unique index.');
      return;
    }

    const extraDocuments = groups.reduce((sum, group) => sum + group.count - 1, 0);
    console.log(
      `Found ${groups.length} duplicate group(s) covering ${extraDocuments} extra document(s):\n`,
    );

    for (const group of groups) {
      const { userId, provider, externalId, type } = group._id;
      console.log(
        `- user=${userId} provider=${provider ?? '<missing>'} externalId=${externalId ?? '<missing>'} type=${type} count=${group.count}`,
      );
      console.log(`  ids: ${group.ids.join(', ')}`);
      console.log(`  titles: ${group.titles.join(' | ')}`);
    }

    console.log(
      '\nResolve these manually (keep the document you want, delete or merge the rest) before creating the unique index.',
    );
    process.exitCode = 1;
  } finally {
    await connection.close();
  }
}

main().catch((error: unknown) => {
  console.error('Duplicate scan failed:', (error as Error).message);
  process.exitCode = 2;
});
