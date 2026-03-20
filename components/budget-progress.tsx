"use client";

import { useState } from "react";
import { useBudgets } from "@/app/(main)/budget-context";
import { useTransactions } from "@/app/(main)/transactions-context";
import { CATEGORIES } from "@/lib/constants";
import { Pencil, Check, X, TrendingUp } from "lucide-react";

const fmt = (n: number) =>
    Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

// EXPENSE categories only — Income should not have a spend budget
const EXPENSE_CATEGORIES = CATEGORIES.filter(c => c.label !== "Income");

export function BudgetProgress() {
    const { budgets, updateBudget } = useBudgets();
    const { transactions, dateFilter } = useTransactions();

    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [editAmount, setEditAmount] = useState<string>("");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleEdit = (category: string, currentAmount: number) => {
        setEditingCategory(category);
        setEditAmount(currentAmount ? currentAmount.toString() : "");
        setErrorMsg(null);
    };

    const handleSave = async (category: string) => {
        const amountNum = parseFloat(editAmount);
        if (!isNaN(amountNum) && amountNum >= 0) {

            // Validation: Ensure category budgets don't exceed overall budget
            const currentCatBudget = budgets.find(b => b.category === category)?.amount || 0;
            // totalBudgeted is computed below, we can compute it here temporarily
            const currentTotal = budgets
                .filter(b => b.category !== "OVERALL" && b.category !== "Income")
                .reduce((s, b) => s + b.amount, 0);

            const newTotalBudgeted = currentTotal - currentCatBudget + amountNum;
            const overallBudgetLimit = budgets.find(b => b.category === "OVERALL")?.amount || 0;

            if (overallBudgetLimit > 0 && newTotalBudgeted > overallBudgetLimit) {
                setErrorMsg(`Cannot save: Total budgets (${fmt(newTotalBudgeted)}) would exceed the overall budget limit of ${fmt(overallBudgetLimit)}.`);
                return; // Stop execution
            }

            setErrorMsg(null);
            await updateBudget(category, amountNum);
        }
        setEditingCategory(null);
        setErrorMsg(null);
    };

    // Filter by date globally
    let filteredTransactions = [...transactions];
    if (dateFilter.range.from) {
        const fromDateStr = dateFilter.range.from.split('T')[0];
        filteredTransactions = filteredTransactions.filter(tx => tx.date.split('T')[0] >= fromDateStr);
    }
    if (dateFilter.range.to) {
        const toDateStr = dateFilter.range.to.split('T')[0];
        filteredTransactions = filteredTransactions.filter(tx => tx.date.split('T')[0] <= toDateStr);
    }

    // Only count expenses for budgeting
    const expenses = filteredTransactions.filter(t => t.amount < 0);

    // Summary totals
    const totalBudgeted = budgets
        .filter(b => b.category !== "OVERALL" && b.category !== "Income")
        .reduce((s, b) => s + b.amount, 0);
    const totalSpent = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);
    const categoriesWithBudget = EXPENSE_CATEGORIES.filter(cat => {
        const b = budgets.find(b => b.category === cat.label);
        return b && b.amount > 0;
    }).length;

    return (
        <div className="space-y-4">
            {/* Summary row */}
            {totalBudgeted > 0 && (
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 text-sm">
                        <TrendingUp className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-muted-foreground">
                            <span className="font-semibold text-foreground">{fmt(totalSpent)}</span> spent of{" "}
                            <span className="font-semibold text-foreground">{fmt(totalBudgeted)}</span> budgeted across{" "}
                            {categoriesWithBudget} {categoriesWithBudget === 1 ? "category" : "categories"}
                        </span>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {errorMsg && (
                <div className="p-3 text-sm rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-medium">
                    {errorMsg}
                </div>
            )}

            {EXPENSE_CATEGORIES.map((cat) => {
                const spending = Math.abs(
                    expenses
                        .filter(t => t.category.label === cat.label)
                        .reduce((sum, tx) => sum + tx.amount, 0)
                );

                const dbBudget = budgets.find(b => b.category === cat.label);
                const limit = dbBudget ? dbBudget.amount : 0;
                const percentage = limit > 0 ? Math.min((spending / limit) * 100, 100) : 0;
                const isOverBudget = limit > 0 && spending > limit;
                const isNearBudget = limit > 0 && !isOverBudget && percentage >= 80;

                const barColor = isOverBudget
                    ? "bg-red-500"
                    : isNearBudget
                        ? "bg-amber-500"
                        : limit === 0
                            ? "bg-muted"
                            : "bg-primary";

                return (
                    <div key={cat.label} className="p-4 border border-border rounded-xl bg-background/50 hover:bg-background/80 transition-colors">
                        <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${cat.color}`} />
                                <span className="font-medium text-sm text-foreground">{cat.label}</span>
                                {spending > 0 && limit === 0 && (
                                    <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full font-medium">No limit set</span>
                                )}
                            </div>

                            {editingCategory === cat.label ? (
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-1.5 text-muted-foreground text-sm">₹</span>
                                        <input
                                            type="number"
                                            value={editAmount}
                                            onChange={(e) => setEditAmount(e.target.value)}
                                            className="w-28 pl-6 pr-2 py-1 text-sm bg-background border border-border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                                            placeholder="0"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSave(cat.label);
                                                if (e.key === 'Escape') setEditingCategory(null);
                                            }}
                                        />
                                    </div>
                                    <button onClick={() => handleSave(cat.label)} className="p-1.5 text-green-500 hover:bg-green-500/10 rounded-md transition-colors">
                                        <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => setEditingCategory(null)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-md transition-colors">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2.5">
                                    <div className="text-sm font-semibold text-foreground text-right">
                                        {fmt(spending)}
                                        <span className="text-muted-foreground font-normal ml-1">
                                            / {limit > 0 ? fmt(limit) : "—"}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleEdit(cat.label, limit)}
                                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                        title={`Set budget for ${cat.label}`}
                                    >
                                        <Pencil className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                style={{ width: `${limit === 0 ? 0 : percentage}%` }}
                            />
                        </div>
                        {isOverBudget && (
                            <p className="text-xs text-red-500 mt-1.5 font-medium">
                                Over budget by {fmt(spending - limit)}
                            </p>
                        )}
                        {isNearBudget && !isOverBudget && (
                            <p className="text-xs text-amber-500 mt-1.5 font-medium">
                                {(100 - percentage).toFixed(0)}% remaining — approaching limit
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
