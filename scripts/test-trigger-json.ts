import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("Fetching raw user metadata from Supabase auth.users...");

    // We have to use raw SQL here because Prisma doesn't officially map to auth.users in standard setups
    const result = await prisma.$queryRawUnsafe(`
        SELECT id, raw_user_meta_data 
        FROM auth.users 
        ORDER BY created_at DESC 
        LIMIT 1;
    `);

    console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
