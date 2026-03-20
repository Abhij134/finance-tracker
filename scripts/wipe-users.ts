import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("Starting full database wipe of all users...");

    try {
        // First delete all from Prisma public."User"
        const deletedUsers = await prisma.user.deleteMany({});
        console.log(`Cleared ${deletedUsers.count} rows from public.User table.`);

        // Then raw execute to delete all from Supabase auth.users
        const authDeleteResult = await prisma.$executeRawUnsafe(`DELETE FROM auth.users;`);
        console.log(`Cleared auth.users table. (Rows affected: ${authDeleteResult})`);

        console.log("Database successfully wiped! You have a fresh slate.");
    } catch (e) {
        console.error("Failed to wipe users:", e);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
