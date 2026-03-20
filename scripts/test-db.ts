import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
    console.log("Testing database connection...");
    const count = await prisma.user.count();
    console.log("Total users:", count);
}
main().catch(console.error).finally(() => prisma.$disconnect());
