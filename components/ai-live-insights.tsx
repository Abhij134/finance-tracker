"use client";

import { useTransactions } from "@/app/(main)/transactions-context";
import { useBudgets } from "@/app/(main)/budget-context";
import { useDailyAllowance } from "@/lib/use-daily-allowance";
import {
  Sparkles, AlertTriangle, TrendingUp, Activity, Target,
  Lightbulb, RefreshCw, Wallet, Coins, HeartPulse
} from "lucide-react";
import { useState, useEffect } from "react";

type Insight = {
  type: "alert" | "pattern" | "forecast" | "opportunity" | "goal" | "cashflow" | "savings_rate";
  priority: "high" | "mid" | "low";
  title: string;
  msg: string;
  action?: string | null;
};

function fmt(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function AiLiveInsights({
  from: propFrom,
  to: propTo,
}: {
  selectedMonth?: string;
  range?: string;
  from?: string;
  to?: string;
}) {
  const { transactions, dateFilter } = useTransactions();
  const { budgets } = useBudgets();

  const from = propFrom || dateFilter.range.from;
  const to = propTo || dateFilter.range.to;

  const { allowance, daysRemaining } = useDailyAllowance(
    transactions || [],
    budgets,
    dateFilter.preset,
    from,
    to
  );

  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const buildLocalInsights = (txs: typeof transactions): Insight[] => {
    const results: Insight[] = [];
    if (!txs || txs.length === 0) return results;
    const expenses = txs.filter((t) => t.amount < 0);
    const income = txs.filter((t) => t.amount > 0);
    const totalExpenses = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);
    const totalIncome = income.reduce((s, t) => s + t.amount, 0);
    if (totalIncome > 0) {
      const rate = ((totalIncome - totalExpenses) / totalIncome) * 100;
      results.push({
        type: "savings_rate", priority: rate < 20 ? "high" : rate < 40 ? "mid" : "low",
        title: `Savings Rate: ${rate.toFixed(0)}%`,
        msg: `You saved ${fmt(totalIncome - totalExpenses)} of ${fmt(totalIncome)} income.`,
        action: rate < 20 ? "Review large expenses" : null,
      });
    }
    const catSpend: Record<string, number> = {};
    expenses.forEach((t) => { catSpend[t.category.label] = (catSpend[t.category.label] || 0) + Math.abs(t.amount); });
    const topCat = Object.entries(catSpend).sort((a, b) => b[1] - a[1])[0];
    if (topCat) {
      results.push({
        type: "pattern", priority: "mid",
        title: `Highest Spend: ${topCat[0]}`,
        msg: `${topCat[0]} accounts for ${fmt(topCat[1])} of your total spending.`,
        action: "Set category budget",
      });
    }
    const net = totalIncome - totalExpenses;
    results.push({
      type: "cashflow", priority: net < 0 ? "high" : "low",
      title: net >= 0 ? "Positive Cash Flow" : "Negative Cash Flow",
      msg: `Net balance: ${fmt(Math.abs(net))} ${net >= 0 ? "surplus" : "deficit"}.`,
      action: net < 0 ? "Reduce expenses" : null,
    });
    return results;
  };

  const fetchInsights = async (force = false) => {
    if (!transactions) return;
    const CACHE_KEY = `ai_insights_data_${from}_${to}`;
    const TIME_KEY = `ai_insights_timestamp_${from}_${to}`;
    const TX_COUNT_KEY = `ai_insights_tx_count_${from}_${to}`;
    setIsLoading(true);
    if (!force && typeof window !== "undefined") {
      const cachedData = localStorage.getItem(CACHE_KEY);
      const cachedTime = localStorage.getItem(TIME_KEY);
      const cachedTxCount = localStorage.getItem(TX_COUNT_KEY);
      if (cachedData && cachedTime && cachedTxCount) {
        const isTxCountSame = parseInt(cachedTxCount) === transactions.length;
        const isRecent = Date.now() - parseInt(cachedTime) < 24 * 60 * 60 * 1000;
        if (isTxCountSame && isRecent) {
          setInsights(JSON.parse(cachedData));
          setIsLoading(false);
          return;
        }
      }
    }
    try {
      const queryParams = new URLSearchParams();
      if (from) queryParams.set("from", from);
      if (to) queryParams.set("to", to);
      queryParams.set("dailyAllowance", (allowance || 0).toString());
      queryParams.set("daysLeft", (daysRemaining || 1).toString());
      const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
      const res = await fetch(`/api/insights${query}`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      if (data.insights && Array.isArray(data.insights) && data.insights.length > 0) {
        setInsights(data.insights);
        if (typeof window !== "undefined") {
          localStorage.setItem(CACHE_KEY, JSON.stringify(data.insights));
          localStorage.setItem(TIME_KEY, Date.now().toString());
          localStorage.setItem(TX_COUNT_KEY, transactions.length.toString());
        }
      } else throw new Error("Empty response");
    } catch {
      setInsights(buildLocalInsights(transactions));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (transactions) fetchInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions?.length, from, to]);

  const getIconInfo = (type: string, priority: string) => {
    // Only use Red/Critical if it's genuinely high priority AND an alert
    if (priority === "high" || type === "alert") {
      return { Icon: AlertTriangle, color: "text-rose-500", border: "border-rose-500", isCritical: priority === "high" };
    }
    switch (type) {
      case "allowance": return { Icon: Coins, color: "text-cyan-400", border: "border-cyan-500/50", isCritical: false };
      case "pattern": return { Icon: Activity, color: "text-blue-500", border: "border-blue-500/50", isCritical: false };
      case "forecast": return { Icon: TrendingUp, color: "text-purple-500", border: "border-purple-500/50", isCritical: false };
      case "health": return { Icon: HeartPulse, color: "text-emerald-500", border: "border-emerald-500/50", isCritical: false };
      case "opportunity": return { Icon: Lightbulb, color: "text-amber-500", border: "border-amber-500/50", isCritical: false };
      case "cashflow": return { Icon: Wallet, color: "text-teal-500", border: "border-teal-500/50", isCritical: false };
      default: return { Icon: Sparkles, color: "text-zinc-400", border: "border-zinc-500/30", isCritical: false };
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-2xl p-5 h-full flex flex-col relative overflow-hidden group/container">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-48 h-48 -mr-16 -mt-16 rounded-full bg-emerald-500/5 blur-[80px] pointer-events-none group-hover/container:bg-emerald-500/10 transition-colors duration-1000" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 shrink-0 relative z-10">
        <h2 className="text-xs font-bold text-zinc-100 flex items-center gap-2.5 uppercase tracking-widest">
          <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
          A.I. Financial Insights
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchInsights(true)}
            disabled={isLoading}
            className="p-1 rounded-md hover:bg-white/5 transition-all text-zinc-500 hover:text-zinc-200 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Insights list (Neon Tiles) ─────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-3.5 overflow-y-auto pr-1.5 relative z-10 custom-scrollbar pb-2">
        {isLoading && !insights && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="relative">
              <Activity className="h-8 w-8 text-emerald-500/20" />
              <Activity className="h-8 w-8 text-emerald-500 absolute top-0 left-0 animate-pulse" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 animate-pulse">Running Heuristics...</p>
          </div>
        )}

        {insights && insights.map((insight, idx) => {
          const i = insight as any;
          const type = i.t || i.type || "info";
          const priority = i.p || i.priority || "low";
          const { Icon, color, border, isCritical } = getIconInfo(type, priority);

          return (
            <div
              key={idx}
              className={`p-5 rounded-xl border border-slate-800/40 border-l-2 ${border} bg-slate-900/40 backdrop-blur-md hover:bg-slate-800/20 transition-all duration-300 group/insight relative overflow-hidden`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl shrink-0 bg-white/5 border border-white/5`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${color}`}>
                      {insight.title || insight.type}
                    </p>
                    {isCritical && (
                      <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-md">
                        <div className="h-1 w-1 rounded-full bg-rose-500 animate-pulse" />
                        <span className="text-[8px] font-black text-rose-400 uppercase">Critical</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed font-medium">
                    {insight.msg}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {!isLoading && insights && insights.length === 0 && (
          <div className="text-center py-10 opacity-30 select-none">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-zinc-700" />
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Awaiting Signal</p>
          </div>
        )}
      </div>
    </div>
  );
}