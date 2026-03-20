import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("Backfilling blank User IDs in the database...");

    // Find all users with a null userId
    const usersWithBlankIds = await prisma.user.findMany({
        where: {
            OR: [
                { userId: null },
                { userId: '' }
            ]
        }
    });

    console.log(`Found ${usersWithBlankIds.length} users needing a User ID.`);

    for (const user of usersWithBlankIds) {
        // Fallback: Use their username, or the first part of their email, plus a random string
        const baseName = user.username || user.email.split('@')[0];
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const generatedUserId = `${baseName}_${randomSuffix}`.toLowerCase();

        console.log(`Updating ${user.email} -> ${generatedUserId}`);

        await prisma.user.update({
            where: { id: user.id },
            data: { userId: generatedUserId }
        });
    }

    console.log("Backfill complete!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
