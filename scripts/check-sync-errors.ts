import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("Fetching sync errors...");
    try {
        const errors = await prisma.user_sync_errors.findMany({
            orderBy: { error_time: 'desc' },
            take: 5
        });
        console.dir(errors, { depth: null });
    } catch (e) {
        console.error("Failed to fetch errors:", e);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
