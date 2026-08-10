"use server"

import { createClient } from "@/utils/supabase/server"
import prisma from "@/lib/prisma"

export async function getSafeToSpendData() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
        return { budget: 0, totalSpent: 0, allowance: 0, daysRemaining: 0, dailyBurnRate: 0, projectedMonthSpend: 0, budgetUsedPct: 0 };
    }

    try {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

        const [budgetRecord, txAggregate] = await Promise.all([
            // 1. Fetch total overall budget via Prisma
            prisma.budget.findFirst({
                where: {
                    userId,
                    category: 'OVERALL',
                },
                select: {
                    amount: true,
                },
            }),
            // 2. Fetch expenses sum for current month using aggregate
            prisma.transaction.aggregate({
                where: {
                    userId,
                    amount: { lt: 0 }, // expenses are negative
                    date: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
                _sum: {
                    amount: true,
                },
            }),
        ]);

        const totalBudget = budgetRecord?.amount || 0;
        const totalSpent = Math.abs(txAggregate._sum.amount || 0);

        // 3. Days remaining & burn rate
        const totalDaysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const dayOfMonth = today.getDate();
        const daysRemaining = (totalDaysInMonth - dayOfMonth) + 1;
        const daysElapsed = dayOfMonth;

        // 4. Daily burn rate (how much spent per day so far this month)
        const dailyBurnRate = daysElapsed > 0 ? totalSpent / daysElapsed : 0;

        // 5. Projected month-end spend based on burn rate
        const projectedMonthSpend = dailyBurnRate * totalDaysInMonth;

        // 6. Budget used percentage
        const budgetUsedPct = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;

        // 7. Daily allowance
        let allowance = 0;
        if (totalBudget > 0 && daysRemaining > 0) {
            const remainingBudget = totalBudget - totalSpent;
            allowance = Math.max(0, remainingBudget / daysRemaining);
        }

        return {
            budget: totalBudget,
            totalSpent,
            allowance,
            daysRemaining,
            dailyBurnRate,
            projectedMonthSpend,
            budgetUsedPct,
        };

    } catch (error) {
        console.error("Error fetching safe to spend data:", error);
        return { budget: 0, totalSpent: 0, allowance: 0, daysRemaining: 0, dailyBurnRate: 0, projectedMonthSpend: 0, budgetUsedPct: 0 };
    }
}

/**
 * Aggregates transaction data grouped by category using Prisma groupBy & _sum
 */
export async function getCategoryAggregates(startDate?: string, endDate?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) return [];

    try {
        const whereClause: any = {
            userId,
            amount: { lt: 0 },
        };

        if (startDate || endDate) {
            whereClause.date = {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate ? { lte: new Date(endDate) } : {}),
            };
        }

        const grouped = await prisma.transaction.groupBy({
            by: ['category'],
            where: whereClause,
            _sum: {
                amount: true,
            },
            _count: {
                _all: true,
            },
        });

        return grouped.map((g) => ({
            category: g.category,
            totalAmount: Math.abs(g._sum.amount || 0),
            count: g._count._all,
        }));
    } catch (error) {
        console.error("Error fetching category aggregates:", error);
        return [];
    }
}

