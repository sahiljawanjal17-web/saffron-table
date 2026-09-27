import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

// Local file in development; set DATABASE_URL=libsql://<db>.turso.io + DATABASE_AUTH_TOKEN in production.
const url = process.env.DATABASE_URL || 'file:data/app.db';

const globalForDb = globalThis as unknown as { libsql?: ReturnType<typeof createClient> };

const client =
  globalForDb.libsql ?? createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });

if (process.env.NODE_ENV !== 'production') globalForDb.libsql = client;

export const db = drizzle(client, { schema });
export { schema };
