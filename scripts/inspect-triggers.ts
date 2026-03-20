import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("Fetching triggers on auth.users...");
    try {
        const triggers = await prisma.$queryRaw`
            SELECT tgname, relname
            FROM pg_trigger
            JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
            JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
            WHERE pg_namespace.nspname = 'auth' AND pg_class.relname = 'users';
        `;
        console.log(triggers);
    } catch (e) {
        console.error("Failed to fetch triggers:", e);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
