import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("Fetching trigger definition...");
    try {
        const triggers = await prisma.$queryRaw`
            SELECT tgname, pg_get_triggerdef(oid) as def
            FROM pg_trigger
            WHERE tgname = 'on_auth_user_created';
        `;
        console.log(triggers);
    } catch (e) {
        console.error("Failed to fetch trigger definition:", e);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
