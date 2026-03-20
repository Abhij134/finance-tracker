"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Edit2, Check, X, Calendar, Wallet, ArrowDownLeft, ArrowUpRight, PiggyBank,
} from "lucide-react";
import { useTransactions } from "../app/(main)/transactions-context";
import { useBudgets } from "../app/(main)/budget-context";
import { CustomDateRangePicker } from "./custom-date-picker";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORY_LABELS } from "@/lib/constants";

function fmt(n: number) {
  return Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Math.abs(n));
}

// Sparkline with mobile-safe tooltips (no overflow)
function MiniSparkline({ data, color, index }: { data: { val: number; label: string }[]; color: string; index: number }) {
  const max = Math.max(...data.map((d) => d.val), 1);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div className="relative">
      <div className="flex items-end gap-[2px] h-6 sm:h-10 w-full">
        {data.map((d, i) => {
          const isZero = d.val === 0;
          return (
            <div
              key={i}
              className="relative flex-1 flex items-end h-full cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              onTouchStart={() => setHoveredIdx(i)}
              onTouchEnd={() => setTimeout(() => setHoveredIdx(null), 1200)}
            >
              <div
                className="w-full rounded-t-sm transition-all duration-300"
                style={{
                  height: isZero ? "3px" : `${Math.max(12, (d.val / max) * 100)}%`,
                  backgroundColor: isZero ? "#374151" : color,
                  opacity: isZero ? 0.3 : 0.6 + (i / data.length) * 0.4,
                }}
              />
              {/* Tooltip — smart positioning to avoid overflow */}
              {hoveredIdx === i && (d.label || !isZero) && (
                <div
                  className="absolute bottom-full mb-1.5 z-50 pointer-events-none"
                  style={{
                    // Position: first third → left-align, last third → right-align, else center
                    left: i < data.length / 3 ? "0" : i > (data.length * 2) / 3 ? "auto" : "50%",
                    right: i > (data.length * 2) / 3 ? "0" : "auto",
                    transform: i >= data.length / 3 && i <= (data.length * 2) / 3 ? "translateX(-50%)" : "none",
                  }}
                >
                  <div className="whitespace-nowrap rounded-lg bg-gray-900/95 border border-white/10 px-2.5 py-1.5 shadow-xl">
                    {d.label && <p className="text-[9px] text-white/50 uppercase tracking-wider mb-0.5">{d.label}</p>}
                    {isZero ? (
                      <p className="text-[10px] text-muted-foreground font-semibold">No Transactions</p>
                    ) : (
                      <p className="text-xs font-bold" style={{ color }}>{fmt(d.val)}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type DatePreset = "all" | "7d" | "30d" | "month" | "custom";

function getLocalYYYYMMDD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function StatCards() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { transactions, dateFilter } = useTransactions();
  const { budgets, updateBudget } = useBudgets();

  const preset = dateFilter.preset;
  const dateRange = dateFilter.range;

  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedBudgetCategory, setSelectedBudgetCategory] = useState("OVERALL");

  const activeBudgetObj = budgets.find((b) => b.category === selectedBudgetCategory);
  const budgetLimit = activeBudgetObj ? activeBudgetObj.amount : 0;
  const [budgetInput, setBudgetInput] = useState("");

  useEffect(() => {
    setBudgetInput(budgetLimit ? budgetLimit.toString() : "");
  }, [budgetLimit, isEditingBudget]);

  const navigateTo = (p: DatePreset, from?: string, to?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", p);
    if (from) params.set("from", from); else params.delete("from");
    if (to) params.set("to", to); else params.delete("to");
    router.push(`/?${params.toString()}`);
  };

  const handleSaveBudget = async () => {
    if (!budgetInput) return;
    setIsSaving(true);
    await updateBudget(selectedBudgetCategory, parseFloat(budgetInput));
    setIsSaving(false);
    setIsEditingBudget(false);
  };

  const filtered = useMemo(() => {
    if (preset === "all") return transactions;
    return transactions.filter((tx) => {
      // Use string comparison to avoid timezone issues with new Date()
      const d = tx.date.substring(0, 10);
      if (dateRange.from && d < dateRange.from) return false;
      if (dateRange.to && d > dateRange.to) return false;
      return true;
    });
  }, [transactions, preset, dateRange]);

  const stats = useMemo(() => {
    let income = 0, expenses = 0;
    const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));
    const incomeTxs = sorted.filter((t) => t.amount > 0);
    const expenseTxs = sorted.filter((t) => t.amount < 0);
    incomeTxs.forEach((t) => (income += t.amount));
    expenseTxs.forEach((t) => (expenses += Math.abs(t.amount)));
    const savings = income - expenses;
    const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;
    const budgetSpent = filtered
      .filter((t) => t.amount < 0 && (selectedBudgetCategory === "OVERALL" || t.category.label === selectedBudgetCategory))
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    const budgetPct = budgetLimit > 0 ? Math.min(100, Math.round((budgetSpent / budgetLimit) * 100)) : 0;

    // Build sparklines bucketed by date
    let incomeHist: { val: number; label: string }[] = [];
    let expenseHist: { val: number; label: string }[] = [];
    let savingsHist: { val: number; label: string }[] = [];

    if (preset !== "all" && dateRange.from && dateRange.to) {
      const start = new Date(dateRange.from + "T00:00:00");
      const end = new Date(dateRange.to + "T23:59:59");
      const daysDiff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const maxBars = Math.min(20, daysDiff); // Cap at 20 bars
      const step = Math.max(1, Math.ceil(daysDiff / maxBars));

      let current = new Date(start);
      while (current <= end && incomeHist.length < maxBars) {
        const bucketEnd = new Date(current);
        bucketEnd.setDate(bucketEnd.getDate() + step - 1);
        const bStart = getLocalYYYYMMDD(current);
        const bEnd = getLocalYYYYMMDD(bucketEnd > end ? end : bucketEnd);

        const label = step === 1
          ? current.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
          : `${current.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}–${(bucketEnd > end ? end : bucketEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;

        const iSum = incomeTxs.filter((t) => { const d = t.date.substring(0, 10); return d >= bStart && d <= bEnd; })
          .reduce((s, t) => s + t.amount, 0);
        const eSum = expenseTxs.filter((t) => { const d = t.date.substring(0, 10); return d >= bStart && d <= bEnd; })
          .reduce((s, t) => s + Math.abs(t.amount), 0);

        incomeHist.push({ val: iSum, label });
        expenseHist.push({ val: eSum, label });
        savingsHist.push({ val: Math.abs(iSum - eSum), label });
        current.setDate(current.getDate() + step);
      }
    } else {
      // All time: group continuously by month
      const monthMap = new Map<string, { income: number; expense: number }>();
      let minMonth = "";
      let maxMonth = "";

      [...incomeTxs, ...expenseTxs].forEach((t) => {
        const key = t.date.substring(0, 7); // YYYY-MM
        if (!minMonth || key < minMonth) minMonth = key;
        if (!maxMonth || key > maxMonth) maxMonth = key;
      });

      if (minMonth && maxMonth) {
        // limit to maximum 24 consecutive months ending at the most recent transaction
        const [minY, minM] = minMonth.split("-").map(Number);
        const [maxY, maxM] = maxMonth.split("-").map(Number);
        let start = new Date(minY, minM - 1, 1);
        const end = new Date(maxY, maxM - 1, 1);

        const cutoff = new Date(maxY, maxM - 1 - 23, 1);
        if (start < cutoff) start = cutoff;

        let curr = new Date(start);
        while (curr <= end) {
          const key = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}`;
          monthMap.set(key, { income: 0, expense: 0 });
          curr = new Date(curr.getFullYear(), curr.getMonth() + 1, 1);
        }
      } else {
        const now = new Date();
        monthMap.set(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, { income: 0, expense: 0 });
      }

      [...incomeTxs, ...expenseTxs].forEach((t) => {
        const key = t.date.substring(0, 7); // YYYY-MM
        if (monthMap.has(key)) {
          const m = monthMap.get(key)!;
          if (t.amount > 0) m.income += t.amount;
          else m.expense += Math.abs(t.amount);
        }
      });

      monthMap.forEach((val, key) => {
        const [y, mo] = key.split("-");
        const label = new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
        incomeHist.push({ val: val.income, label });
        expenseHist.push({ val: val.expense, label });
        savingsHist.push({ val: Math.abs(val.income - val.expense), label });
      });
    }

    return {
      income, expenses, savings, savingsRate, budgetPct, budgetSpent,
      incomeCount: incomeTxs.length, expenseCount: expenseTxs.length,
      incomeHist, expenseHist, savingsHist,
    };
  }, [filtered, budgetLimit, selectedBudgetCategory, dateRange]);

  return (
    <div className="space-y-3">
      {/* Date Filter Bar */}
      <div className="relative z-20 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/80 px-3 py-2.5 shadow-sm">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium text-muted-foreground">Period:</span>
        <div className="flex items-center gap-1 flex-wrap">
          {(["all", "month"] as DatePreset[]).map((p) => (
            <button
              key={p}
              onClick={() => navigateTo(p)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${preset === p
                ? "border border-primary/60 bg-primary/10 text-primary shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
            >
              {p === "all" ? "All Time" : "This Month"}
            </button>
          ))}
          <div className="">
            <CustomDateRangePicker
              from={preset === "custom" ? dateRange.from : ""}
              to={preset === "custom" ? dateRange.to : ""}
              onRangeChange={(f, t) => navigateTo("custom", f, t)}
            />
          </div>
        </div>
        <div className="ml-auto hidden sm:flex items-center gap-1.5">
          <span className="text-[10px] font-medium text-muted-foreground">Total:</span>
          <span className="text-xs font-bold text-primary tabular-nums">
            {stats.incomeCount + stats.expenseCount}
          </span>
          <span className="text-[10px] text-muted-foreground">transactions</span>
        </div>
      </div>

      {/* 2×2 Stat Cards Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Income */}
        <StatCard
          title="Total Income"
          value={fmt(stats.income)}
          sub={`${stats.incomeCount} entries`}
          icon={<ArrowDownLeft className="h-3.5 w-3.5" />}
          color="#10B981"
          data={stats.incomeHist}
          index={0}
        />
        {/* Expenses */}
        <StatCard
          title="Total Expenses"
          value={fmt(stats.expenses)}
          sub={`${stats.expenseCount} entries`}
          icon={<ArrowUpRight className="h-3.5 w-3.5" />}
          color="#EF4444"
          data={stats.expenseHist}
          index={1}
        />
        {/* Net Savings */}
        <StatCard
          title="Net Savings"
          value={`${stats.savings >= 0 ? "" : "-"}${fmt(stats.savings)}`}
          sub={`${stats.savingsRate}% savings rate`}
          icon={<PiggyBank className="h-3.5 w-3.5" />}
          color={stats.savings >= 0 ? "#84CC16" : "#F97316"}
          data={stats.savingsHist}
          index={2}
        />

        {/* Budget Card */}
        <div className="relative bg-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-2xl p-3 sm:p-4 flex flex-col overflow-hidden group">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-20 h-20 bg-violet-500 rounded-full blur-[35px] pointer-events-none opacity-20" />
          <div className="flex justify-between items-start relative z-10 mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground leading-tight">
              {selectedBudgetCategory === "OVERALL" ? "Budget Used" : `${selectedBudgetCategory} Budget`}
            </p>
            <button
              onClick={() => setIsEditingBudget(!isEditingBudget)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-all border border-violet-500/20 shrink-0"
            >
              <span className="text-[9px] font-bold uppercase">{isEditingBudget ? "Cancel" : "Edit"}</span>
              {isEditingBudget ? <X className="h-2.5 w-2.5" /> : <Edit2 className="h-2.5 w-2.5" />}
            </button>
          </div>

          <div className="relative z-10 flex-1">
            {isEditingBudget ? (
              <div className="space-y-2">
                <select
                  value={selectedBudgetCategory}
                  onChange={(e) => setSelectedBudgetCategory(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-violet-500 outline-none"
                >
                  <option value="OVERALL">Overall Budget</option>
                  {CATEGORY_LABELS.filter((l) => l !== "Income").map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1.5 bg-background p-1.5 rounded-lg border focus-within:ring-1 focus-within:ring-violet-500">
                  <span className="text-muted-foreground font-bold text-sm shrink-0">₹</span>
                  <input
                    type="number" value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    className="bg-transparent font-bold w-full focus:outline-none text-xs" placeholder="0"
                  />
                  <button onClick={handleSaveBudget} disabled={isSaving}
                    className="p-1 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-md transition-colors shrink-0">
                    {isSaving
                      ? <div className="h-3 w-3 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                      : <Check className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xl sm:text-2xl font-extrabold text-violet-400">
                  {budgetLimit > 0 ? `${stats.budgetPct}%` : "Not Set"}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                  {fmt(stats.budgetSpent)} of {fmt(budgetLimit)}
                </p>
                <p className="text-[9px] text-muted-foreground/50 uppercase tracking-tight mt-0.5">
                  {preset === "all" ? "Total" : preset === "7d" ? "in 7 Days" : preset === "30d" ? "in 30 Days" : preset === "month" ? "This Month" : "in Range"}
                </p>
              </>
            )}
          </div>

          {!isEditingBudget && (
            <div className="mt-auto pt-2 relative z-10">
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${stats.budgetPct}%`, backgroundColor: stats.budgetPct >= 100 ? "#EF4444" : "#8B5CF6" }}
                />
              </div>
              {budgetLimit > 0 && (
                <div className="flex justify-between mt-1 text-[9px] text-muted-foreground/40">
                  <span>₹0</span><span>{fmt(budgetLimit)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Extracted StatCard sub-component
function StatCard({ title, value, sub, icon, color, data, index }: {
  title: string; value: string; sub: string;
  icon: React.ReactNode; color: string;
  data: { val: number; label: string }[]; index: number;
}) {
  return (
    <div className="relative bg-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-2xl p-3 sm:p-4 flex flex-col overflow-hidden">
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-20 h-20 rounded-full blur-[35px] pointer-events-none opacity-20"
        style={{ backgroundColor: color }} />
      <div className="flex justify-between items-start relative z-10">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground leading-tight">{title}</p>
        <div className="p-1 rounded-md shrink-0" style={{ backgroundColor: `${color}18` }}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
      <p className="text-xl sm:text-2xl font-extrabold mt-1.5 leading-none relative z-10 truncate tabular-nums" style={{ color }}>
        {value}
      </p>
      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 relative z-10 truncate">{sub}</p>
      <div className="mt-auto pt-2 relative z-10">
        <MiniSparkline data={data} color={color} index={index} />
      </div>
    </div>
  );
}