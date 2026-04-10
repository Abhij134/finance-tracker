import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local manually so Prisma CLI can find variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Derive the session-mode pooler URL (IPv4 compliant) from the transaction-mode pooler URL
// This allows db push/migrations to succeed on port 5432 via the pooler, bypassing IPv6 timeouts
const fallbackDirectUrl = process.env.DATABASE_URL
    ? process.env.DATABASE_URL.replace(':6543', ':5432').replace('?pgbouncer=true', '')
    : undefined;

export default defineConfig({
    datasource: {
        url: process.env.DATABASE_URL,
        directUrl: fallbackDirectUrl,
    },
} as any);
