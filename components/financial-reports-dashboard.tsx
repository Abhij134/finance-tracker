"use client";

import { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { Calendar, Clock, MousePointer2 } from "lucide-react";
import { useTransactions, DatePreset } from "@/app/(main)/transactions-context";
import { toLocalISO } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";
import { CustomDateRangePicker } from "@/components/custom-date-picker";
import { BudgetProgress } from "@/components/budget-progress";


function CustomTooltip({ active, payload, label, formatter }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/90 border border-emerald-500/20 backdrop-blur-md p-3 rounded-xl shadow-xl text-xs font-semibold">
        <p className="text-zinc-400 mb-1.5">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-zinc-200">{entry.name}:</span>
            <span style={{ color: entry.color }}>
              {formatter ? formatter(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export function FinancialReportsDashboard() {
  const { transactions, dateFilter, setDateFilter } = useTransactions();

  const fmt = (n: number) =>
    Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Math.abs(n));

  // Filter transactions by date range
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];
    if (dateFilter.range.from) {
      const fromDateStr = dateFilter.range.from.split('T')[0];
      filtered = filtered.filter(tx => tx.date.split('T')[0] >= fromDateStr);
    }
    if (dateFilter.range.to) {
      const toDateStr = dateFilter.range.to.split('T')[0];
      filtered = filtered.filter(tx => tx.date.split('T')[0] <= toDateStr);
    }
    return filtered.sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, dateFilter.range]);

  // 1. Process Chart Data
  const chartData = useMemo(() => {
    const groupBy = (txs: any[]) => {
      const groups: Record<string, { income: number; expenses: number }> = {};

      // Determine date range: from filter or fallback to transaction range
      let startStr = dateFilter.range.from?.split('T')[0];
      let endStr = dateFilter.range.to?.split('T')[0];

      // Fix Next.js "all" preset 1970 bug by defaulting startStr to empty if "all" timeframe
      if (dateFilter.preset === "all") {
        startStr = "";
        endStr = "";
      }

      if (!startStr && txs.length > 0) {
        startStr = txs[0].date.split('T')[0];
      }
      if (!endStr && txs.length > 0) {
        endStr = txs[txs.length - 1].date.split('T')[0];
      }
      if (!endStr) endStr = toLocalISO(new Date()); // Final fallback to today

      if (!startStr) return [];
      if (!endStr) endStr = startStr;

      const start = new Date(startStr + 'T00:00:00');
      const end = new Date(endStr + 'T23:59:59');

      // Group by Day (YYYY-MM-DD)
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        groups[toLocalISO(d)] = { income: 0, expenses: 0 };
      }

      txs.forEach(tx => {
        let dateKey = "";
        if (typeof tx.date === 'string') dateKey = tx.date.split('T')[0];
        else if (tx.date instanceof Date) dateKey = tx.date.toISOString().split('T')[0];
        else return;

        if (groups[dateKey] !== undefined) {
          if (tx.category.label === "Income") {
            groups[dateKey].income += Math.abs(tx.amount);
          } else {
            groups[dateKey].expenses += Math.abs(tx.amount);
          }
        }
      });

      return Object.keys(groups).sort().map(key => {
        const d = new Date(key);
        return {
          name: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
          income: groups[key].income,
          expenses: groups[key].expenses,
          rawDate: key
        };
      });
    };

    const aggregated = groupBy(filteredTransactions);
    if (aggregated.length === 0) {
      return [{ name: "No Data", income: 0, expenses: 0 }];
    }
    return aggregated;
  }, [filteredTransactions, dateFilter.range]);

  const finalChartData = chartData;


  return (
    <div className="min-h-screen text-zinc-100 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Date Filter Bar — Same style as Dashboard */}
      <div className="relative z-50 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-md px-3 py-2.5 shadow-sm">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium text-muted-foreground">Period:</span>
        <div className="flex items-center gap-1 flex-wrap">
          {(["all", "month"] as DatePreset[]).map((p) => (
            <button
              key={p}
              onClick={() => {
                const today = new Date();
                let to = toLocalISO(today);
                let from = "";
                if (p === "month") {
                  from = toLocalISO(new Date(today.getFullYear(), today.getMonth(), 1));
                  to = toLocalISO(new Date(today.getFullYear(), today.getMonth() + 1, 0));
                }
                setDateFilter({ preset: p, range: { from, to } });
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${dateFilter.preset === p
                ? "border border-primary/60 bg-primary/10 text-primary shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
            >
              {p === "all" ? "All Time" : "This Month"}
            </button>
          ))}
          <div className="">
            <CustomDateRangePicker
              from={dateFilter.preset === "custom" ? dateFilter.range.from : ""}
              to={dateFilter.preset === "custom" ? dateFilter.range.to : ""}
              onRangeChange={(from, to) => setDateFilter({ preset: "custom", range: { from, to } })}
            />
          </div>
        </div>
        <div className="ml-auto hidden sm:flex items-center gap-1.5">
          <span className="text-[10px] font-medium text-muted-foreground">Total:</span>
          <span className="text-xs font-bold text-primary tabular-nums">
            {filteredTransactions.length}
          </span>
          <span className="text-[10px] text-muted-foreground">transactions</span>
        </div>
      </div>

      {/* Top Grid: Cash Flow Trend (Full Width) */}
      <div className="grid grid-cols-1 gap-6 relative z-10">
        <div className="bg-white/[0.04] backdrop-blur-md border border-white/10 shadow-[0_8px_30px_rgba(16,185,129,0.05)] rounded-2xl p-4 sm:p-6 flex flex-col min-h-[240px] sm:min-h-[380px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-zinc-100">Cash Flow Trend</h2>
            <div className="flex items-center gap-4 text-xs font-medium text-zinc-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                Income
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-zinc-400"></span>
                Expenses
              </div>
            </div>
          </div>

          <div className="flex-1 w-full min-w-0 relative overflow-x-auto custom-scrollbar pb-6">
            <div style={{ minWidth: `max(120%, ${finalChartData.length * 100}px)`, height: '100%' }}>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={finalChartData} margin={{ top: 10, right: 30, left: -20, bottom: 25 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9CA3AF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#9CA3AF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.3} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    dy={12}
                    interval={0}
                    height={40}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                    domain={[0, 'auto']}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} />} />
                  <Area type="monotone" dataKey="income" name="Income" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#9CA3AF" strokeWidth={3} fillOpacity={1} fill="url(#colorExpenses)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Budget Progress (Full Width) */}
      <div className="relative z-10">

        {/* Customizable Budget Category Tracker */}
        <div className="bg-[#1A2229]/80 backdrop-blur-md border border-emerald-500/10 shadow-[0_8px_30px_rgb(16,185,129,0.03)] rounded-2xl p-6 flex flex-col min-h-[380px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-zinc-100">Budget Progress</h2>
            <p className="text-xs font-medium text-zinc-400 max-w-[200px] text-right hidden sm:block">
              Track limits. Click ✏️ to customize your budget category limit.
            </p>
          </div>

          <div className="flex-1 w-full relative overflow-y-auto pr-2 custom-scrollbar">
            {/* Inject the BudgetProgress Component directly */}
            <BudgetProgress />
          </div>
        </div>

      </div>
    </div >
  );
}