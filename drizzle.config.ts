import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error('DATABASE_URL (or DATABASE_DIRECT_URL) is required for drizzle-kit');
}

export default defineConfig({
  schema: ['./src/db/schema.ts', './src/db/auth-schema.ts'],
  out: './drizzle', // where migrations / snapshots go
  dialect: 'postgresql',
  dbCredentials: {
    url,
  },
});
