import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import type { NeonQueryResultHKT } from 'drizzle-orm/neon-serverless';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { ExtractTablesWithRelations } from 'drizzle-orm';

// No `ws` import — Edge runtime provides WebSocket globally.
// neon-serverless uses it automatically without webSocketConstructor being set.
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const db = drizzle({ client: pool });

/** Union of the module-level db instance and a transaction callback argument.
 *  Use this as the parameter type for helpers that need to work both
 *  standalone and inside a db.transaction() block. */
export type DbOrTx =
  | typeof db
  | PgTransaction<
      NeonQueryResultHKT,
      Record<string, never>,
      ExtractTablesWithRelations<Record<string, never>>
    >;
