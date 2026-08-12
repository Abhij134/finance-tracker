"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

export async function getBudgets() {
    let userId = null;
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
    } catch (e: any) {
        if (e?.digest === 'DYNAMIC_SERVER_USAGE') {
            throw e;
        }
        console.error('getBudgets Auth error:', e);
    }

    if (!userId) return [];

    try {
        const budgets = await prisma.budget.findMany({
            where: { userId: userId },
            select: {
                id: true,
                category: true,
                amount: true,
            }
        });

        return budgets;
    } catch (e) {
        console.error("Failed to fetch budgets:", e);
        return [];
    }
}

export async function setBudget(category: string, amount: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) throw new Error("Unauthorized");

    try {
        await prisma.user.upsert({
            where: { id: userId },
            update: {},
            create: {
                id: userId,
                email: user.email || `${userId}@user.local`,
                name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
            }
        });

        const upsertedBudget = await prisma.budget.upsert({
            where: {
                userId_category: {
                    userId: userId,
                    category: category
                }
            },
            update: {
                amount: amount,
            },
            create: {
                userId: userId,
                category: category,
                amount: amount,
            },
            select: {
                id: true,
                category: true,
                amount: true,
            }
        });

        revalidatePath("/dashboard/budget");
        return upsertedBudget;
    } catch (e: any) {
        console.error("Failed to set budget specifically:", e);
        throw new Error(e.message || "Failed to set budget");
    }
}
