"use server"

import { createClient } from "@/utils/supabase/server"

export async function getSafeToSpendData() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
        return { budget: 0, totalSpent: 0, allowance: 0, daysRemaining: 0, dailyBurnRate: 0, projectedMonthSpend: 0, budgetUsedPct: 0 };
    }

    try {
        // 1. Fetch total overall budget
        const { data: budgetData, error: budgetError } = await supabase
            .from('Budget')
            .select('amount')
            .eq('userId', userId)
            .eq('category', 'OVERALL')
            .single();

        let totalBudget = 0;
        if (!budgetError && budgetData) {
            totalBudget = budgetData.amount;
        }

        // 2. Fetch expenses for current month
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

        const { data: txData, error: txError } = await supabase
            .from('Transaction')
            .select('amount')
            .eq('userId', userId)
            .lt('amount', 0) // expenses are negative
            .gte('date', startOfMonth)
            .lte('date', endOfMonth);

        let totalSpent = 0;
        if (!txError && txData) {
            totalSpent = txData.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        }

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
