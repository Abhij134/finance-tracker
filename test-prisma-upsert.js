const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const user = await prisma.user.findFirst();
    if (!user) {
        console.log("No users found");
        return;
    }
    
    console.log("Found user:", user.id);
    
    try {
        const category = "OVERALL";
        const amount = 5000;
        const upserted = await prisma.budget.upsert({
            where: { userId_category: { userId: user.id, category } },
            update: { amount },
            create: { userId: user.id, category, amount },
        });
        console.log("Upserted successfully:", upserted);
    } catch (e) {
        console.error("Prisma error:", e);
    }
}

run().finally(() => prisma.$disconnect());
