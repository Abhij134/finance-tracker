import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("Fetching all users...");
    try {
        const users = await prisma.user.findMany();
        console.log(`Found ${users.length} users:`);
        users.forEach(u => console.log(`${u.id} - ${u.email} - ${u.username}`));
    } catch (e) {
        console.error("Failed to fetch users:", e);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
