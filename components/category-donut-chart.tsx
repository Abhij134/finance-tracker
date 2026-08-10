"use client";

import { useMemo, useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Sector,
} from "recharts";
import { TrendingUp, PieChart as PieIcon } from "lucide-react";

const SafePie = Pie as any;

// Category -> color mapping — matches FinanceNeo CATEGORIES constants
const CAT_COLORS: Record<string, string> = {
  UPI: "#3B82F6",
  "UPI Transfer": "#06B6D4",
  Foods: "#10B981",
  "Food & Dining": "#EAB308",
  Entertainment: "#8B5CF6",
  Shopping: "#EC4899",
  Transport: "#F97316",
  "Fuel & Auto": "#B45309",
  Health: "#06B6D4",
  "Health & Medical": "#14B8A6",
  Utilities: "#EAB308",
  "Bills & Utilities": "#6B7280",
  Groceries: "#84CC16",
  Travel: "#0EA5E9",
  Education: "#3B82F6",
  Income: "#10B981",
  Investment: "#6366F1",
  Subscriptions: "#8B5CF6",
  "Rent & Housing": "#E11D48",
  Other: "#64748B",
};

const FALLBACK_PALETTE = [
  "#10B981",
  "#3B82F6",
  "#EC4899",
  "#F97316",
  "#8B5CF6",
  "#EAB308",
  "#06B6D4",
  "#64748B",
  "#84CC16",
  "#E11D48",
];

const fmt = (n: number) =>
  Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

const compactFmt = (n: number) =>
  Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: n >= 100000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(n);

interface CategoryDonutChartProps {
  filteredTransactions?: any[];
  aggregatedData?: Array<{ category: string; totalAmount: number; count?: number }>;
}

// Renders the "exploded" / emphasized active segment with a glowing outer ring
const renderActiveShape = (props: any) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
  } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      {/* Outer accent ring */}
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 14}
        fill={fill}
        opacity={0.45}
      />
    </g>
  );
};

// External labels — always visible, compact on mobile to prevent clipping
const renderOuterLabel = (props: any, isMobile: boolean) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, outerRadius, percent, name, fill } = props;

  if (!percent || percent < 0.03) return null;

  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);

  // Compact offsets for mobile so text stays comfortably inside container bounds
  const rOffset = isMobile ? 8 : 22;
  const hOffset = isMobile ? 6 : 18;
  const textOffset = isMobile ? 2 : 6;
  const nameFontSize = isMobile ? 9 : 11;
  const pctFontSize = isMobile ? 8 : 10;

  const sx = cx + (outerRadius + 2) * cos;
  const sy = cy + (outerRadius + 2) * sin;
  const mx = cx + (outerRadius + rOffset) * cos;
  const my = cy + (outerRadius + rOffset) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * hOffset;
  const ey = my;
  const textAnchor = cos >= 0 ? "start" : "end";

  const displayName = isMobile && name.length > 11 ? `${name.slice(0, 9)}..` : name;

  return (
    <g>
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke={fill}
        strokeWidth={1.1}
        fill="none"
        opacity={0.65}
      />
      <circle cx={ex} cy={ey} r={2} fill={fill} />
      <text
        x={ex + (cos >= 0 ? textOffset : -textOffset)}
        y={ey - 3}
        textAnchor={textAnchor}
        fill="#f0f4f8"
        fontSize={nameFontSize}
        fontWeight={600}
      >
        {displayName}
      </text>
      <text
        x={ex + (cos >= 0 ? textOffset : -textOffset)}
        y={ey + (isMobile ? 8 : 10)}
        textAnchor={textAnchor}
        fill="#94a3b8"
        fontSize={pctFontSize}
      >
        {(percent * 100).toFixed(0)}%
      </text>
    </g>
  );
};

export function CategoryDonutChart({
  filteredTransactions,
  aggregatedData,
}: CategoryDonutChartProps) {
  const { data, total, top } = useMemo(() => {
    if (aggregatedData && aggregatedData.length > 0) {
      const arr = aggregatedData
        .map((item, i) => ({
          name: item.category,
          value: item.totalAmount,
          count: item.count ?? 1,
          color:
            CAT_COLORS[item.category] ||
            FALLBACK_PALETTE[i % FALLBACK_PALETTE.length],
        }))
        .sort((a, b) => b.value - a.value);

      const sum = arr.reduce((s, d) => s + d.value, 0);
      return { data: arr, total: sum, top: arr[0] };
    }

    const txs = filteredTransactions || [];
    const expenses = txs.filter((t) => t.amount < 0);
    const grouped = expenses.reduce((acc, tx) => {
      const cat = tx.category?.label ?? (typeof tx.category === 'string' ? tx.category : "Other");
      if (!acc[cat]) acc[cat] = { value: 0, count: 0 };
      acc[cat].value += Math.abs(tx.amount);
      acc[cat].count += 1;
      return acc;
    }, {} as Record<string, { value: number; count: number }>);

    const arr = Object.entries(grouped)
      .map(([name, v], i) => ({
        name,
        value: (v as any).value as number,
        count: (v as any).count as number,
        color:
          CAT_COLORS[name] || FALLBACK_PALETTE[i % FALLBACK_PALETTE.length],
      }))
      .sort((a, b) => b.value - a.value);

    const sum = arr.reduce((s, d) => s + d.value, 0);
    return { data: arr, total: sum, top: arr[0] };
  }, [filteredTransactions, aggregatedData]);

  const [activeIndex, setActiveIndex] = useState(0);
  // Lazy init so isMobile is correct on FIRST render (avoids hydration flash showing labels)
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Pass isMobile into label function
  const labelFn = (props: any) => renderOuterLabel(props, isMobile);

  // Empty state
  if ((!filteredTransactions || filteredTransactions.length === 0) && (!aggregatedData || aggregatedData.length === 0) || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full flex-1 w-full text-zinc-500 border border-dashed border-slate-700/50 rounded-xl bg-slate-900/20 p-6 min-h-[350px]">
        <PieIcon className="w-12 h-12 mb-4 opacity-20 text-zinc-600" />
        <p className="text-sm font-medium">No expense data for this period.</p>
        <p className="text-xs opacity-60 text-center max-w-xs mt-1">
          Select a different date range or add transactions.
        </p>
      </div>
    );
  }

  const active = data[activeIndex] ?? top;
  const activePct = total ? (active.value / total) * 100 : 0;

  return (
    <div className="w-full">
      {/* Chart with center summary overlay */}
      <div className="relative" style={{ width: "100%", height: isMobile ? 280 : 360 }}>
        <ResponsiveContainer>
          <PieChart margin={isMobile ? { top: 8, right: 8, bottom: 8, left: 8 } : { top: 20, right: 60, bottom: 20, left: 60 }}>
            <defs>
              {data.map((d, i) => (
                <linearGradient
                  key={`grad-${i}`}
                  id={`donut-grad-${i}`}
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="1"
                >
                  <stop offset="0%" stopColor={d.color} stopOpacity={1} />
                  <stop offset="100%" stopColor={d.color} stopOpacity={0.7} />
                </linearGradient>
              ))}
            </defs>
            <SafePie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={isMobile ? 56 : 86}
              outerRadius={isMobile ? 78 : 120}
              paddingAngle={2}
              stroke="#0f172a"
              strokeWidth={2}
              dataKey="value"
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              onMouseEnter={(_: any, i: number) => setActiveIndex(i)}
              label={labelFn}
              labelLine={false}
              isAnimationActive
              animationDuration={650}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#donut-grad-${index})`}
                  style={{
                    filter:
                      index === activeIndex
                        ? `drop-shadow(0 0 10px ${entry.color}66)`
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
          <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-medium">
            {isMobile && active.name.length > 12 ? `${active.name.slice(0, 10)}..` : active.name}
          </span>
          <span
            className="mt-0.5 sm:mt-1 text-base sm:text-2xl font-bold tabular-nums"
            style={{ color: active.color }}
          >
            {compactFmt(active.value)}
          </span>
          <span className="text-[10px] sm:text-[11px] text-zinc-500">
            {activePct.toFixed(1)}% · {active.count} txn
            {active.count !== 1 ? "s" : ""}
          </span>
          <div className="mt-1 sm:mt-2 h-px w-7 sm:w-10 bg-slate-700" />
          <span className="mt-1 sm:mt-2 text-[8px] sm:text-[10px] uppercase tracking-wider text-zinc-500">
            Total
          </span>
          <span className="text-xs sm:text-sm font-semibold text-zinc-100 tabular-nums">
            {fmt(total)}
          </span>
        </div>
      </div>

      {/* Top category highlight */}
      <div className="mt-2 flex items-center justify-center gap-2 text-xs text-zinc-500">
        <TrendingUp className="h-3.5 w-3.5" style={{ color: top.color }} />
        <span>
          Top spend:{" "}
          <span className="font-semibold text-zinc-200">{top.name}</span> ·{" "}
          {((top.value / total) * 100).toFixed(0)}% of total
        </span>
      </div>

      {/* Interactive legend with progress bars */}
      <div className="mt-4 grid gap-2">
        {data.map((d, i) => {
          const pct = total ? (d.value / total) * 100 : 0;
          const isActive = i === activeIndex;
          return (
            <button
              key={d.name}
              onMouseEnter={() => setActiveIndex(i)}
              onFocus={() => setActiveIndex(i)}
              onClick={() => setActiveIndex(i)}
              className={`group w-full rounded-xl border px-3 py-2 text-left transition-all duration-200 ${
                isActive
                  ? "border-slate-600 bg-slate-800/60"
                  : "border-slate-800/40 bg-transparent hover:bg-slate-800/30 hover:border-slate-700/60"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full transition-all duration-200"
                    style={{
                      background: d.color,
                      boxShadow: isActive ? `0 0 8px ${d.color}99` : "none",
                    }}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-zinc-200">
                      {d.name}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {d.count} transaction{d.count !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold tabular-nums text-zinc-100">
                    {fmt(d.value)}
                  </div>
                  <div className="text-[11px] tabular-nums text-zinc-500">
                    {pct.toFixed(1)}%
                  </div>
                </div>
              </div>
              {/* Animated progress bar */}
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${d.color}, ${d.color}88)`,
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
