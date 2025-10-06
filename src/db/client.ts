import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';  // uses postgres.js driver under the hood

declare global {
  // eslint-disable-next-line no-var
  var __DRIZZLE_SQL__: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var __DRIZZLE_DB__: ReturnType<typeof drizzle> | undefined;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const sql = globalThis.__DRIZZLE_SQL__ ?? postgres(connectionString, {
  max: 10,         // maximum number of connections your app uses
  prepare: false,  // disable prepared statements (safer behind PgBouncer)
  ssl: { rejectUnauthorized: false },  // depending on your SSL / cert setup
});

if (process.env.NODE_ENV !== 'production') globalThis.__DRIZZLE_SQL__ = sql;

export const db = globalThis.__DRIZZLE_DB__ ?? drizzle(sql);
if (process.env.NODE_ENV !== 'production') globalThis.__DRIZZLE_DB__ = db;
