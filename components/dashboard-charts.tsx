"use client";

import { useMemo, useState } from "react";
import { Calendar } from "lucide-react";
import { useTransactions } from "@/app/(main)/transactions-context";
import { useBudgets } from "@/app/(main)/budget-context";
import { CategoryDonutChart } from "./category-donut-chart";
import { CustomDateRangePicker } from "./custom-date-picker";
import { SafeToSpendCard } from "./safe-to-spend-card";
import { useDailyAllowance } from "@/lib/use-daily-allowance";

type DatePreset = "all" | "7d" | "30d" | "month" | "custom";

function getPresetRange(preset: DatePreset): { from: string; to: string } {
    const today = new Date();
    const format = (d: Date) => d.toISOString().split("T")[0];

    if (preset === "7d") {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return { from: format(d), to: format(today) };
    }
    if (preset === "30d") {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return { from: format(d), to: format(today) };
    }
    if (preset === "month") {
        const d = new Date(today.getFullYear(), today.getMonth(), 1);
        return { from: format(d), to: format(today) };
    }
    return { from: "", to: "" };
}

export function DashboardCharts() {
    const { transactions } = useTransactions();
    const { budgets } = useBudgets();

    // Date filter state — default to "month"
    const [preset, setPreset] = useState<DatePreset>("month");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");

    const safeToSpendData = useDailyAllowance(transactions, budgets, preset, customFrom, customTo);
    const filtered = safeToSpendData.filteredTransactions;
    const periodLabel = safeToSpendData.periodLabel;

    return (
        <div className="space-y-6">
            {/* ── Date Filter Bar ─────────────────────────────────────────── */}
            <div className="relative z-50 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/80 backdrop-blur-sm px-4 py-3 shadow-sm">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-muted-foreground mr-1">Period:</span>

                {(["all", "7d", "30d", "month", "custom"] as DatePreset[]).map((p) => (
                    <button
                        key={p}
                        onClick={() => {
                            setPreset(p);
                            if (p === "custom" && !customFrom && !customTo) {
                                const today = new Date();
                                const format = (d: Date) => d.toISOString().split("T")[0];
                                setCustomFrom(format(new Date(today.getFullYear(), today.getMonth(), 1)));
                                setCustomTo(format(today));
                            }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all border
                            ${preset === p
                                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                    >
                        {p === "all" ? "All" : p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : p === "month" ? "Month" : "Custom"}
                    </button>
                ))}

                {preset === "custom" && (
                    <>
                        <div className="h-5 w-px bg-border mx-1" />
                        <CustomDateRangePicker
                            from={customFrom}
                            to={customTo}
                            onRangeChange={(f, t) => {
                                setCustomFrom(f);
                                setCustomTo(t);
                            }}
                        />
                    </>
                )}

                <div className="ml-auto text-xs text-muted-foreground font-medium hidden sm:block">
                    {periodLabel} · {filtered.length} transactions
                </div>
            </div>

            {/* ── Charts Grid ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-6 relative z-10 items-stretch">
                {/* Spending Breakdown (Donut Chart) */}
                <div className="bg-slate-900/50 backdrop-blur-md border border-emerald-500/20 shadow-[0_8px_30px_rgb(16,185,129,0.05)] rounded-2xl flex flex-col w-full h-full min-h-[350px]">
                    <div className="p-6 border-b border-border shrink-0">
                        <h2 className="text-lg font-semibold">Spending Proportion</h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Relative proportion of total expenses by category.
                        </p>
                    </div>
                    <div className="p-6 flex-1 flex items-center justify-center">
                        <CategoryDonutChart filteredTransactions={filtered} />
                    </div>
                </div>
            </div>
        </div>
    );
}
