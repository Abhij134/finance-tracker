"use client";

import { Zap, ShieldCheck, AlertTriangle, TrendingUp, TrendingDown, Flame } from "lucide-react";

interface SafeToSpendCardProps {
    data: {
        budget: number;
        totalSpent: number;
        allowance: number;
        daysRemaining: number;
        dailyBurnRate?: number;
        projectedMonthSpend?: number;
        budgetUsedPct?: number;
        periodLabel?: string;
    };
}

export function SafeToSpendCard({ data }: SafeToSpendCardProps) {
    const { budget, allowance, daysRemaining, totalSpent, dailyBurnRate = 0, projectedMonthSpend = 0, budgetUsedPct = 0, periodLabel } = data;

    const fmt = (n: number) =>
        Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(n);

    if (!budget || budget === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-6 text-center h-full min-h-[350px] rounded-xl border border-zinc-800 bg-card text-muted-foreground shadow-md">
                <ShieldCheck className="h-10 w-10 text-zinc-600 mb-3" />
                <h3 className="text-lg font-semibold text-zinc-400">Daily Allowance</h3>
                <p className="text-sm mt-2 max-w-[220px] leading-relaxed">
                    Set an overall monthly budget to unlock your smart daily spending limits.
                </p>
            </div>
        );
    }

    const isExceeded = allowance <= 0;
    const hasSpendingData = totalSpent > 0;
    const willOverspend = projectedMonthSpend > budget;
    const projectedDiff = Math.abs(projectedMonthSpend - budget);
    const projectedPct = budget > 0 ? Math.round((projectedMonthSpend / budget) * 100) : 0;

    return (
        <div className="relative bg-slate-900/50 backdrop-blur-md border border-emerald-500/20 shadow-[0_8px_30px_rgb(16,185,129,0.05)] rounded-2xl flex flex-col h-full min-h-[350px] overflow-hidden group">
            {/* Background Glow */}
            <div
                className={`absolute top-0 right-0 -mr-16 -mt-16 w-40 h-40 rounded-full blur-[60px] pointer-events-none transition-colors duration-500
                    ${isExceeded ? 'bg-rose-500/15' : 'bg-emerald-500/15'}
                `}
            />

            {/* Header */}
            <div className="px-5 pt-5 pb-2 z-10 shrink-0">
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
                    Daily Allowance
                </h2>
                <p className="text-xs text-zinc-600 mt-0.5 tracking-wide">
                    {periodLabel ? `Safe to spend · ${periodLabel}` : "Safe to spend today"}
                </p>
            </div>

            {/* Main Amount */}
            <div className="px-5 pb-4 z-10">
                {isExceeded ? (
                    <>
                        <p className="text-[52px] font-black leading-none tracking-tight text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                            {fmt(0)}
                        </p>
                        <p className="text-sm mt-2 font-medium text-rose-400/80">
                            Budget exceeded — freeze spending!
                        </p>
                    </>
                ) : (
                    <>
                        <p className="text-[52px] font-black leading-none tracking-tight text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                            {fmt(allowance)}
                        </p>
                        <p className="text-sm mt-2 font-medium text-zinc-400">
                            {hasSpendingData
                                ? `${fmt(dailyBurnRate)}/day avg burn rate`
                                : "No transactions yet this period"}
                        </p>
                    </>
                )}
            </div>

            {/* AI Projection Row — only show when there's actual spending data */}
            {hasSpendingData ? (
                <div className={`mx-5 mb-4 p-3 rounded-xl border z-10 flex items-center gap-3
                    ${willOverspend
                        ? 'bg-rose-500/5 border-rose-500/20'
                        : 'bg-emerald-500/5 border-emerald-500/20'}
                `}>
                    <div className={`p-1.5 rounded-lg shrink-0
                        ${willOverspend ? 'bg-rose-500/15' : 'bg-emerald-500/15'}
                    `}>
                        {willOverspend
                            ? <TrendingUp className="h-4 w-4 text-rose-400" />
                            : <TrendingDown className="h-4 w-4 text-emerald-400" />
                        }
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-0.5">AI Projection</p>
                        <p className={`text-sm font-bold truncate
                            ${willOverspend ? 'text-rose-400' : 'text-emerald-400'}
                        `}>
                            {willOverspend
                                ? `Overspend by ${fmt(projectedDiff)} at month-end`
                                : `${fmt(projectedDiff)} under budget predicted`}
                        </p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg shrink-0
                        ${willOverspend ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'}
                    `}>
                        {projectedPct}%
                    </span>
                </div>
            ) : null}

            {/* Budget Used Progress Bar */}
            <div className="px-5 mb-5 z-10">
                <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wide flex items-center gap-1">
                        <Flame className="h-3 w-3" /> Budget Used
                    </span>
                    <span className="text-[11px] font-bold text-zinc-300">{budgetUsedPct}%</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ease-out
                            ${budgetUsedPct >= 90 ? 'bg-rose-500' : budgetUsedPct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}
                        `}
                        style={{ width: `${budgetUsedPct}%` }}
                    />
                </div>
            </div>

            {/* Footer Stats */}
            <div className="mt-auto z-10 pt-4 px-5 pb-5 border-t border-zinc-800/60 grid grid-cols-3 gap-3">
                <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-1">Days Left</span>
                    <span className="text-base font-bold text-zinc-200">{daysRemaining}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-1">Spent</span>
                    <span className="text-base font-bold text-zinc-200">{fmt(totalSpent)}</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-1">Budget</span>
                    <span className="text-base font-bold text-zinc-200">{fmt(budget)}</span>
                </div>
            </div>
        </div>
    );
}
