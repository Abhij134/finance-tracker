import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("Fetching trigger function definition...");
    try {
        const result = await prisma.$queryRaw`
            SELECT pg_get_functiondef(p.oid) AS definition
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = 'handle_new_user';
        `;
        console.log(result);
    } catch (e) {
        console.error("Failed to fetch trigger:", e);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
