import { PrismaClient } from "@prisma/client";
import * as fs from 'fs';
const prisma = new PrismaClient();

async function main() {
    try {
        const result: any = await prisma.$queryRaw`
            SELECT pg_get_functiondef(p.oid) AS definition
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = 'handle_new_user';
        `;
        fs.writeFileSync('trigger-def.txt', result[0].definition);
        console.log("Saved trigger definition to trigger-def.txt");
    } catch (e) {
        console.error("Failed to fetch trigger:", e);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
