"use client";

import { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Sector,
} from "recharts";
import { TrendingUp, Tag, ChevronDown, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTransactions } from "@/app/(main)/transactions-context";

const SafePie = Pie as any;

// ── Color map ─────────────────────────────────────────────────────────────────
const getCategoryHex = (label: string): string => {
  switch (label) {
    case "Food & Dining": return "#EAB308";
    case "Groceries": return "#84CC16";
    case "Shopping": return "#EC4899";
    case "Transport": return "#F97316";
    case "Fuel & Auto": return "#F97316";
    case "Travel": return "#0EA5E9";
    case "Health & Medical": return "#14B8A6";
    case "Bills & Utilities": return "#6B7280";
    case "Entertainment": return "#A855F7";
    case "Education": return "#3B82F6";
    case "UPI Transfer": return "#06B6D4";
    case "Income": return "#10B981";
    case "Investment": return "#6366F1";
    case "Subscriptions": return "#8B5CF6";
    case "Rent & Housing": return "#E11D48";
    case "Other": return "#64748B";
    default: return "#64748B";
  }
};

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  `₹${Math.round(n).toLocaleString("en-IN")}`;

const compactFmt = (n: number) =>
  Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: n >= 100000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(n);

// ── Active (exploded) segment ─────────────────────────────────────────────────
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 9}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      {/* Thin glowing accent ring */}
      <Sector
        cx={cx} cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 13}
        outerRadius={outerRadius + 16}
        fill={fill}
        opacity={0.4}
      />
    </g>
  );
};

// ── External leader-line labels ───────────────────────────────────────────────
const renderOuterLabel = (props: any) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, outerRadius, percent, name, fill } = props;

  if (!percent || percent < 0.04) return null;

  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 4) * cos;
  const sy = cy + (outerRadius + 4) * sin;
  const mx = cx + (outerRadius + 22) * cos;
  const my = cy + (outerRadius + 22) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 16;
  const ey = my;
  const textAnchor = cos >= 0 ? "start" : "end";

  return (
    <g>
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke={fill}
        strokeWidth={1.2}
        fill="none"
        opacity={0.65}
      />
      <circle cx={ex} cy={ey} r={2.5} fill={fill} />
      <text
        x={ex + (cos >= 0 ? 6 : -6)}
        y={ey - 4}
        textAnchor={textAnchor}
        fill="#e2e8f0"
        fontSize={11}
        fontWeight={600}
      >
        {name}
      </text>
      <text
        x={ex + (cos >= 0 ? 6 : -6)}
        y={ey + 10}
        textAnchor={textAnchor}
        fill="#64748b"
        fontSize={10}
      >
        {(percent * 100).toFixed(0)}%
      </text>
    </g>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
export function CategoryBreakdown() {
  const { transactions, dateFilter } = useTransactions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Filter by date
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];
    if (dateFilter.range.from) {
      const from = dateFilter.range.from.split("T")[0];
      filtered = filtered.filter((tx) => tx.date.split("T")[0] >= from);
    }
    if (dateFilter.range.to) {
      const to = dateFilter.range.to.split("T")[0];
      filtered = filtered.filter((tx) => tx.date.split("T")[0] <= to);
    }
    return filtered;
  }, [transactions, dateFilter.range]);

  // Build pie data, including per-category transaction list
  const { data, total, top } = useMemo(() => {
    const expenses = filteredTransactions.filter(
      (t) => t.amount < 0 || t.category.label !== "Income"
    );
    const grouped: Record<string, { value: number; count: number; txs: typeof expenses }> = {};
    expenses.forEach((tx) => {
      const cat = tx.category.label;
      if (!grouped[cat]) grouped[cat] = { value: 0, count: 0, txs: [] };
      grouped[cat].value += Math.abs(tx.amount);
      grouped[cat].count += 1;
      grouped[cat].txs.push(tx);
    });

    // Sort transactions within each category by date desc
    Object.values(grouped).forEach((g) =>
      g.txs.sort((a, b) => b.date.localeCompare(a.date))
    );

    const arr = Object.entries(grouped)
      .map(([name, g]) => ({
        name,
        value: g.value,
        count: g.count,
        txs: g.txs,
        color: getCategoryHex(name),
      }))
      .sort((a, b) => b.value - a.value);

    const sum = arr.reduce((s, d) => s + d.value, 0);
    return { data: arr, total: sum, top: arr[0] };
  }, [filteredTransactions]);

  const toggleCategory = (name: string) =>
    setExpandedCategory((prev) => (prev === name ? null : name));

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md p-5 flex flex-col items-center justify-center min-h-[300px] gap-3">
        <Tag className="h-8 w-8 text-zinc-700 opacity-40" />
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">
          No Expenses Found
        </p>
      </div>
    );
  }

  const active = data[activeIndex] ?? top;
  const activePct = total ? (active.value / total) * 100 : 0;

  return (
    <div
      className="rounded-2xl p-4 sm:p-2 flex flex-col relative overflow-hidden h-full"
      style={{
        background: "linear-gradient(135deg, rgba(155, 197, 183, 0.1) 0%, rgba(0, 0, 0, 0.05) 50%, rgba(66, 75, 40, 0.2) 100%)",
        border: "1px solid rgba(240, 208, 208, 0.1)",
        backdropFilter: "blur(20px)",
        boxShadow: "inset 0 1px 0 rgba(206, 183, 183, 0.12), 0 8px 32px rgba(0,0,0,0.4), inset 0 -60px 120px -40px rgba(179, 216, 204, 0.06)",
      }}
    >

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-4 shrink-0">
        <h2 className="text-[10px] sm:text-xs font-bold text-zinc-100 uppercase tracking-widest flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
          Category Breakdown
        </h2>
        {total > 0 && (
          <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md uppercase">
            {fmt(total)}
          </span>
        )}
      </div>

      {/* ── Donut chart + center overlay ──────────────────────────────────── */}
      <div className="relative" style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <PieChart>
            <defs>
              {data.map((d, i) => (
                <linearGradient
                  key={`cb-grad-${i}`}
                  id={`cb-grad-${i}`}
                  x1="0" y1="0" x2="1" y2="1"
                >
                  <stop offset="0%" stopColor={d.color} stopOpacity={1} />
                  <stop offset="100%" stopColor={d.color} stopOpacity={0.65} />
                </linearGradient>
              ))}
            </defs>
            <SafePie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={72}
              outerRadius={108}
              paddingAngle={2}
              stroke="#0f172a"
              strokeWidth={2}
              dataKey="value"
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              onMouseEnter={(_: any, i: number) => setActiveIndex(i)}
              label={renderOuterLabel}
              labelLine={false}
              isAnimationActive
              animationDuration={700}
              animationEasing="ease-out"
            >
              {data.map((entry, i) => (
                <Cell
                  key={`cb-cell-${i}`}
                  fill={`url(#cb-grad-${i})`}
                  style={{
                    filter:
                      i === activeIndex
                        ? `drop-shadow(0 0 12px ${entry.color}55)`
                        : "none",
                    cursor: "pointer",
                    transition: "filter 200ms ease",
                  }}
                />
              ))}
            </SafePie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center overlay — active category summary */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">
            {active.name}
          </span>
          <span
            className="mt-1 text-xl font-black tabular-nums leading-tight"
            style={{ color: active.color }}
          >
            {compactFmt(active.value)}
          </span>
          <span className="text-[10px] text-zinc-500 mt-0.5">
            {activePct.toFixed(1)}% · {active.count} txn{active.count !== 1 ? "s" : ""}
          </span>
          <div className="mt-2 h-px w-8 bg-slate-700" />
          <span className="mt-1.5 text-[9px] uppercase tracking-widest text-zinc-600">
            Total
          </span>
          <span className="text-sm font-bold text-zinc-200 tabular-nums">
            {fmt(total)}
          </span>
        </div>
      </div>



      {/* ── Interactive legend: progress bars + expandable transactions ──── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar mt-1 pr-1 flex flex-col gap-2">
        {data.map((d, i) => {
          const pct = total ? (d.value / total) * 100 : 0;
          const isActive = i === activeIndex;
          const isExpanded = expandedCategory === d.name;

          return (
            <div
              key={d.name}
              className={`rounded-xl border transition-all duration-200 overflow-hidden ${isActive || isExpanded
                  ? "border-slate-600/80 bg-slate-800/60"
                  : "border-slate-800/50 bg-transparent hover:bg-slate-800/30 hover:border-slate-700/60"
                }`}
            >
              {/* Row header — hover syncs chart, click expands transactions */}
              <button
                className="w-full px-3 py-2.5 text-left group"
                onMouseEnter={() => setActiveIndex(i)}
                onFocus={() => setActiveIndex(i)}
                onClick={() => toggleCategory(d.name)}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Left: dot + name + tx count */}
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full transition-all duration-200"
                      style={{
                        background: d.color,
                        boxShadow: isActive ? `0 0 8px ${d.color}99` : "none",
                      }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-zinc-200 group-hover:text-zinc-100 transition-colors">
                        {d.name}
                      </p>
                      <p className="text-[10px] text-zinc-600">
                        {d.count} transaction{d.count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  {/* Right: amount + % + chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-black tabular-nums text-zinc-100">
                        {fmt(d.value)}
                      </p>
                      <p className="text-[10px] tabular-nums text-zinc-500">
                        {pct.toFixed(1)}%
                      </p>
                    </div>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-zinc-600 transition-transform duration-300 group-hover:text-zinc-400 ${isExpanded ? "rotate-180 text-emerald-400" : ""
                        }`}
                    />
                  </div>
                </div>

                {/* Animated progress bar */}
                <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-slate-800/80">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${d.color}, ${d.color}77)`,
                      boxShadow: isActive ? `0 0 6px ${d.color}55` : "none",
                    }}
                  />
                </div>
              </button>

              {/* Expandable transactions panel — glassmorphism */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                  >
                    {/* Glass panel */}
                    <div className="mx-2 mb-2 rounded-xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-md overflow-hidden">
                      {/* Panel header */}
                      <div
                        className="px-3 py-1.5 flex items-center gap-1.5 border-b border-white/[0.06]"
                        style={{ background: `${d.color}20` }}
                      >
                        <span
                          className="h-2 w-2 rounded-full shadow-sm"
                          style={{ background: d.color, boxShadow: `0 0 6px ${d.color}88` }}
                        />
                        <span className="text-[9px] uppercase font-black tracking-widest" style={{ color: d.color }}>
                          {d.name} Transactions
                        </span>
                      </div>

                      {/* Transaction rows */}
                      <div className="divide-y divide-white/[0.04] max-h-[200px] overflow-y-auto custom-scrollbar">
                        {d.txs.map((tx, txIdx) => (
                          <motion.div
                            key={tx.id || txIdx}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: txIdx * 0.04, duration: 0.18 }}
                            className="flex items-center justify-between px-3 py-2.5 hover:bg-white/[0.04] transition-colors border-l-2"
                            style={{ borderLeftColor: `${d.color}55` }}
                          >
                            {/* Merchant + date */}
                            <div className="min-w-0 flex-1 pr-3">
                              <p className="text-[12px] font-bold text-zinc-100 truncate">
                                {tx.merchant}
                              </p>
                              <p className="text-[10px] flex items-center gap-1 mt-0.5 font-medium" style={{ color: `${d.color}cc` }}>
                                <Calendar className="h-2.5 w-2.5" style={{ color: `${d.color}99` }} />
                                {new Date(tx.date).toLocaleDateString("en-IN", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                            {/* Amount */}
                            <span
                              className="text-sm font-black tabular-nums shrink-0 px-2 py-0.5 rounded-lg"
                              style={{ color: d.color, background: `${d.color}15` }}
                            >
                              {fmt(Math.abs(tx.amount))}
                            </span>
                          </motion.div>
                        ))}
                      </div>

                      {/* Panel footer: category total */}
                      <div
                        className="px-3 py-2 flex justify-between items-center border-t border-white/[0.06]"
                        style={{ background: `${d.color}18` }}
                      >
                        <span className="text-[9px] uppercase tracking-wider font-bold" style={{ color: `${d.color}bb` }}>
                          Category Total
                        </span>
                        <span
                          className="text-xs font-black tabular-nums px-2 py-0.5 rounded-md"
                          style={{ color: d.color, background: `${d.color}20`, border: `1px solid ${d.color}30` }}
                        >
                          {fmt(d.value)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
