"use client";

import { useTransactions } from "@/app/(main)/transactions-context";
import { useBudgets } from "@/app/(main)/budget-context";
import { useDailyAllowance } from "@/lib/use-daily-allowance";
import {
  Sparkles, AlertTriangle, TrendingUp, TrendingDown,
  PiggyBank, Tag, Calendar, ArrowLeftRight,
  ShoppingBag, RefreshCw, Activity
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

type InsightSeverity = "critical" | "warning" | "info" | "positive";

type Insight = {
  type: string;
  title: string;
  message: string;
  severity: InsightSeverity;
  icon: string;
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
  const [rateLimited, setRateLimited] = useState(false);

  const lastFetchRef = useRef<number>(0);
  const cachedInsightsRef = useRef<any[]>([]);
  const INSIGHTS_STALE_MS = 60 * 60 * 1000; // 1 hour

  // ── Fallback built client-side when API fails ────────────────────────────
  const buildLocalInsights = (txs: typeof transactions): Insight[] => {
    if (!txs || txs.length === 0) return [];
    const expenses = txs.filter((t) => t.amount < 0);
    const income = txs.filter((t) => t.amount > 0);
    const totalExpenses = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);
    const totalIncome = income.reduce((s, t) => s + t.amount, 0);
    const results: Insight[] = [];

    if (totalIncome > 0) {
      const net = totalIncome - totalExpenses;
      results.push({
        type: "savings",
        title: net < 0 ? "LOW SAVINGS RATE" : "SAVINGS RATE",
        message: net < 0
          ? `Spending exceeds income by ${fmt(totalExpenses - totalIncome)}. Review discretionary spending.`
          : `You're saving well! You've stashed away ${fmt(net)} so far.`,
        severity: net < 0 ? "critical" : "positive",
        icon: net >= 0 ? "piggy-bank" : "trending-down",
      });
    }

    const catSpend: Record<string, number> = {};
    expenses.forEach((t) => {
      catSpend[t.category.label] = (catSpend[t.category.label] || 0) + Math.abs(t.amount);
    });
    const topCat = Object.entries(catSpend).sort((a, b) => b[1] - a[1])[0];
    if (topCat) {
      results.push({
        type: "top_category",
        title: `TOP: ${topCat[0].toUpperCase()}`,
        message: `${topCat[0]} accounts for ${fmt(topCat[1])} of your total spending this period.`,
        severity: "info",
        icon: "tag",
      });
    }

    const net = totalIncome - totalExpenses;
    results.push({
      type: "cashflow",
      title: net >= 0 ? "POSITIVE CASH FLOW" : "NEGATIVE CASH FLOW",
      message: `Net balance is a ${fmt(Math.abs(net))} ${net >= 0 ? "surplus" : "deficit"} this period.`,
      severity: net < 0 ? "warning" : "positive",
      icon: net >= 0 ? "trending-up" : "trending-down",
    });

    return results;
  };

  // ── Fetch insights from API ──────────────────────────────────────────────
  const fetchInsights = async (force = false) => {
    if (!transactions) return;

    const now = Date.now();
    if (
      !force &&
      cachedInsightsRef.current.length > 0 &&
      now - lastFetchRef.current < INSIGHTS_STALE_MS
    ) {
      setInsights(cachedInsightsRef.current);
      return;
    }

    const CACHE_KEY = `ai_insights_v2_${from}_${to}`;

    let hasValidCache = false;
    if (!force && typeof window !== "undefined") {
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        try {
          const parsed: Insight[] = JSON.parse(cachedData);
          setInsights(parsed);
          setIsLoading(false);
          hasValidCache = true;
        } catch (_) {}
      }
    }

    if (!hasValidCache) setIsLoading(true);

    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      params.set("dailyAllowance", (allowance || 0).toString());
      params.set("daysLeft", (daysRemaining || 1).toString());

      const res = await fetch(`/api/insights?${params.toString()}`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();

      if (data.insights && Array.isArray(data.insights) && data.insights.length > 0) {
        const sanitized: Insight[] = data.insights;
        setInsights(sanitized);

        cachedInsightsRef.current = sanitized;
        lastFetchRef.current = Date.now();
        setRateLimited(!!data.rateLimited);

        if (typeof window !== "undefined") {
          localStorage.setItem(CACHE_KEY, JSON.stringify(sanitized));
        }
      } else throw new Error("Empty response");
    } catch {
      if (!hasValidCache) setInsights(buildLocalInsights(transactions));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (transactions) fetchInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  // ── Icon map ─────────────────────────────────────────────────────────────
  const getIcon = (icon: string) => {
    const map: Record<string, React.ReactNode> = {
      "trending-up":      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-current" />,
      "trending-down":    <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-current" />,
      "piggy-bank":       <PiggyBank className="w-4 h-4 sm:w-5 sm:h-5 text-current" />,
      "alert-triangle":   <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-current" />,
      "tag":              <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-current" />,
      "calendar":         <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-current" />,
      "arrow-left-right": <ArrowLeftRight className="w-4 h-4 sm:w-5 sm:h-5 text-current" />,
      "shopping-bag":     <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-current" />,
      // legacy aliases
      trending_up:        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-current" />,
      trending_down:      <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-current" />,
      savings:            <PiggyBank className="w-4 h-4 sm:w-5 sm:h-5 text-current" />,
      warning:            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-current" />,
      category:           <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-current" />,
      transfer:           <ArrowLeftRight className="w-4 h-4 sm:w-5 sm:h-5 text-current" />,
      shopping:           <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-current" />,
    };
    return map[icon] ?? <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-current" />;
  };

  // ── Severity → color classes ─────────────────────────────────────────────
  const getSeverityClasses = (severity: InsightSeverity) => {
    if (severity === "critical") return "text-red-400 bg-red-500/10 border-red-500/20";
    if (severity === "warning")  return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    if (severity === "positive") return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    // "info" — subtle blue
    return "text-blue-400 bg-blue-500/10 border-blue-500/20";
  };

  return (
    <div
      className="rounded-2xl p-3.5 sm:p-5 h-full flex flex-col relative overflow-hidden group/container transition-shadow duration-1000"
      style={{
        background: "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(255,255,255,0.04) 50%, rgba(0,0,0,0.22) 100%)",
        border: "1px solid rgba(255,255,255,0.10)",
        backdropFilter: "blur(20px)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3 sm:mb-4 shrink-0 relative z-10">
        <h2 className="text-[10px] sm:text-xs font-bold text-zinc-100 flex items-center gap-2 uppercase tracking-widest">
          <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-500" />
          A.I. Insights
        </h2>
        <button
          onClick={() => fetchInsights(true)}
          disabled={isLoading}
          className="p-1 rounded-md hover:bg-white/5 transition-all text-zinc-500 hover:text-zinc-200 active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Insights list */}
      <div className="flex-1 flex flex-col gap-2.5 sm:gap-3 overflow-y-auto pr-1 relative z-10 custom-scrollbar pb-1">

        {/* Loading */}
        {isLoading && !insights && (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div className="relative">
              <Activity className="h-6 w-6 text-emerald-500/20" />
              <Activity className="h-6 w-6 text-emerald-500 absolute top-0 left-0 animate-pulse" />
            </div>
            <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-600 animate-pulse">Analyzing...</p>
          </div>
        )}

        {insights && insights.map((insight, idx) => {
          const severity = insight.severity as InsightSeverity ?? "info";
          const colorClasses = getSeverityClasses(severity);

          return (
            <div
              key={idx}
              className={`p-3 sm:p-4 rounded-xl border-l-[3px] bg-slate-900/30 backdrop-blur-sm hover:bg-slate-800/20 transition-all duration-300 relative overflow-hidden shrink-0 ${colorClasses}`}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg shrink-0 bg-white/5 border border-white/5 flex items-center justify-center text-current">
                  {getIcon(insight.icon)}
                </div>

                <div className="min-w-0 flex-1">
                  {/* Title row */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-current">
                      {insight.title}
                    </p>
                    {severity === "critical" && (
                      <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-md shrink-0">
                        <div className="h-1 w-1 rounded-full bg-rose-500 animate-pulse" />
                        <span className="text-[7px] font-black text-rose-400 uppercase">Critical</span>
                      </div>
                    )}
                  </div>

                  {/* Message */}
                  <p className="text-xs sm:text-sm text-slate-200 leading-snug font-medium">
                    {insight.message}
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

        {rateLimited && (
          <p className="text-[10px] text-muted-foreground/40 text-center mt-2">
            Showing cached insights · updates hourly
          </p>
        )}
      </div>
    </div>
  );
}