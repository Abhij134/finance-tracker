import { useMemo } from "react";
import { Tx } from "@/app/(main)/transactions-context";
import { Budget } from "@/app/(main)/budget-context";

export function useDailyAllowance(
    transactions: Tx[],
    budgets: Budget[],
    preset: string,
    customFrom?: string,
    customTo?: string
) {
    return useMemo(() => {
        const overallBudget = budgets.find(b => b.category === "OVERALL")?.amount ?? 0;

        // Filter transactions logically
        const filtered = (() => {
            if (preset === "all") return transactions;
            return transactions.filter((tx) => {
                const d = tx.date;
                if (customFrom && d < customFrom) return false;
                if (customTo && d > customTo) return false;
                return true;
            });
        })();

        // Determine period bounds for 'daily' calculations
        const today = new Date();
        const localYYYYMM = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');

        // Note: For daily allowance, calculate based on the transactions within the selected period bounds.
        const expenses = filtered.filter(tx => tx.amount < 0);
        const totalSpent = expenses.reduce((s, tx) => s + Math.abs(tx.amount), 0);

        let daysRemaining = 1;
        let daysElapsed = 1;
        let totalDaysInPeriod = 1;

        if (preset === "month") {
            const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            const dayOfMonth = today.getDate();
            daysElapsed = dayOfMonth;
            daysRemaining = (daysInMonth - dayOfMonth) + 1;
            totalDaysInPeriod = daysInMonth;
        } else if (preset === "7d") {
            daysElapsed = 7;
            daysRemaining = 1;
            totalDaysInPeriod = 7;
        } else if (preset === "30d") {
            daysElapsed = 30;
            daysRemaining = 1;
            totalDaysInPeriod = 30;
        } else if (preset === "custom" && customFrom && customTo) {
            const from = new Date(customFrom);
            const to = new Date(customTo);
            totalDaysInPeriod = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
            daysElapsed = totalDaysInPeriod;
            daysRemaining = 1;
        } else {
            daysElapsed = 30;
            daysRemaining = 1;
            totalDaysInPeriod = 30;
        }

        const dailyBurnRate = daysElapsed > 0 ? totalSpent / daysElapsed : 0;
        const projectedMonthSpend = dailyBurnRate * totalDaysInPeriod;
        const budgetUsedPct = overallBudget > 0 ? Math.min(100, Math.round((totalSpent / overallBudget) * 100)) : 0;

        let allowance = 0;
        if (overallBudget > 0 && daysRemaining > 0) {
            const remaining = overallBudget - totalSpent;
            allowance = Math.max(0, remaining / daysRemaining);
        }

        let periodLabel = "All Time";
        switch (preset) {
            case "7d": periodLabel = "Last 7 Days"; break;
            case "30d": periodLabel = "Last 30 Days"; break;
            case "month": periodLabel = "This Month"; break;
            case "custom":
                if (customFrom && customTo) periodLabel = `${customFrom} → ${customTo}`;
                else if (customFrom) periodLabel = `From ${customFrom}`;
                else if (customTo) periodLabel = `Until ${customTo}`;
                else periodLabel = "Custom Range";
                break;
        }

        return {
            budget: overallBudget,
            totalSpent,
            allowance,
            daysRemaining,
            dailyBurnRate,
            projectedMonthSpend,
            budgetUsedPct,
            periodLabel,
            filteredLength: filtered.length,
            filteredTransactions: filtered,
        };
    }, [transactions, budgets, preset, customFrom, customTo]);
}
