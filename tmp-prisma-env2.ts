import { PrismaClient } from '@prisma/client';
import "dotenv/config"; // load from .env
import fs from 'fs';

const prisma = new PrismaClient();

async function run() {
    const url = process.env.DATABASE_URL || "NOT_SET";
    fs.writeFileSync('tmp-prisma-url.txt', url, 'utf8');
    try {
        const user = await prisma.user.findFirst();
        fs.appendFileSync('tmp-prisma-url.txt', '\nConnected successfully, user: ' + (user?.id || "None"), 'utf8');
    } catch (e: any) {
        fs.appendFileSync('tmp-prisma-url.txt', '\nError: ' + typeof e + ' ' + e.message, 'utf8');
    } finally {
        await prisma.$disconnect();
    }
}
run();
