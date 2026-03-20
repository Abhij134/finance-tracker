import { PrismaClient } from '@prisma/client';
import "dotenv/config"; // load from .env

const prisma = new PrismaClient();

async function run() {
    console.log("DATABASE_URL FROM ENV:", process.env.DATABASE_URL);
    try {
        const user = await prisma.user.findFirst();
        console.log("Connected successfully, user:", user?.id || "None");
    } catch (e: any) {
        console.error("Prisma Connection Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}
run();
