import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local manually so Prisma CLI can find DIRECT_URL
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

export default defineConfig({
    datasource: {
        url: process.env.DIRECT_URL ?? "",
    },
} as any);
