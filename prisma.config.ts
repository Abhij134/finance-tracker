import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local manually so Prisma CLI can find DIRECT_URL
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// THE FIX: Mutate process.env so Prisma CLI uses the IPv4-capable pooler domain.
// This bypasses IPv6-related P1001 errors on restricted networks.
if (process.env.DATABASE_URL?.includes("db.ngegqphmpvqmwkkxoabn.supabase.co")) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace("db.ngegqphmpvqmwkkxoabn.supabase.co", "ngegqphmpvqmwkkxoabn.supabase.org");
}
if (process.env.DIRECT_URL?.includes("db.ngegqphmpvqmwkkxoabn.supabase.co")) {
    process.env.DIRECT_URL = process.env.DIRECT_URL.replace("db.ngegqphmpvqmwkkxoabn.supabase.co", "ngegqphmpvqmwkkxoabn.supabase.org");
}

export default defineConfig({
    datasource: {
        url: process.env.DATABASE_URL,
        directUrl: process.env.DIRECT_URL,
    },
} as any);
