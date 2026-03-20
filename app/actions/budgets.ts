"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

export async function getBudgets() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

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
