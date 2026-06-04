"use client";

import { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Sector,
} from "recharts";
import { TrendingUp, PieChart as PieIcon } from "lucide-react";

const SafePie = Pie as any;

// Category -> color mapping
const CAT_COLORS: Record<string, string> = {
  UPI: "#3B82F6",
  "UPI Transfer": "#06B6D4",
  Foods: "#10B981",
  "Food & Dining": "#EAB308",
  Entertainment: "#8B5CF6",
  Shopping: "#EC4899",
  Transport: "#F97316",
  "Fuel & Auto": "#F97316",
  Health: "#06B6D4",
  Utilities: "#EAB308",
  Other: "#64748B",
};

const FALLBACK_PALETTE = [
  "#3B82F6",
  "#10B981",
  "#EC4899",
  "#F97316",
  "#8B5CF6",
  "#EAB308",
  "#06B6D4",
  "#64748B",
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
  filteredTransactions: any[];
}

// Renders the "exploded" / emphasized active segment with a clean outer ring
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

// External labels — always visible (no hover required)
const renderOuterLabel = (props: any) => {
  const RADIAN = Math.PI / 180;
  const {
    cx,
    cy,
    midAngle,
    outerRadius,
    percent,
    name,
    fill,
  } = props;

  if (!percent || percent < 0.04) return null; // hide tiny slices

  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 4) * cos;
  const sy = cy + (outerRadius + 4) * sin;
  const mx = cx + (outerRadius + 22) * cos;
  const my = cy + (outerRadius + 22) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 18;
  const ey = my;
  const textAnchor = cos >= 0 ? "start" : "end";

  return (
    <g>
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke={fill}
        strokeWidth={1.25}
        fill="none"
        opacity={0.7}
      />
      <circle cx={ex} cy={ey} r={2.5} fill={fill} />
      <text
        x={ex + (cos >= 0 ? 6 : -6)}
        y={ey - 4}
        textAnchor={textAnchor}
        fill="hsl(var(--foreground))"
        fontSize={11}
        fontWeight={600}
      >
        {name}
      </text>
      <text
        x={ex + (cos >= 0 ? 6 : -6)}
        y={ey + 10}
        textAnchor={textAnchor}
        fill="hsl(var(--muted-foreground))"
        fontSize={10}
      >
        {(percent * 100).toFixed(0)}%
      </text>
    </g>
  );
};

export function CategoryDonutChart({
  filteredTransactions,
}: CategoryDonutChartProps) {
  const { data, total, top } = useMemo(() => {
    const expenses = filteredTransactions.filter((t) => t.amount < 0);
    const grouped = expenses.reduce((acc, tx) => {
      const cat = tx.category?.label ?? "Other";
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
        color: CAT_COLORS[name] || FALLBACK_PALETTE[i % FALLBACK_PALETTE.length],
      }))
      .sort((a, b) => b.value - a.value);

    const sum = arr.reduce((s, d) => s + d.value, 0);
    return { data: arr, total: sum, top: arr[0] };
  }, [filteredTransactions]);

  const [activeIndex, setActiveIndex] = useState(0);

  if (filteredTransactions.length === 0 || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full flex-1 w-full text-muted-foreground border border-dashed border-border/50 rounded-xl bg-muted/10 p-6 min-h-[350px]">
        <PieIcon className="w-12 h-12 mb-4 opacity-20" />
        <p>No expense data for this period.</p>
        <p className="text-sm opacity-70 text-center max-w-xs mt-1">
          Select a different date range or add transactions.
        </p>
      </div>
    );
  }

  const active = data[activeIndex] ?? top;
  const activePct = total ? (active.value / total) * 100 : 0;

  return (
    <div className="w-full">
      {/* Chart with center summary */}
      <div className="relative" style={{ width: "100%", height: 360 }}>
        <ResponsiveContainer>
          <PieChart>
            <defs>
              {data.map((d, i) => (
                <linearGradient
                  key={`grad-${i}`}
                  id={`grad-${i}`}
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="1"
                >
                  <stop offset="0%" stopColor={d.color} stopOpacity={1} />
                  <stop offset="100%" stopColor={d.color} stopOpacity={0.72} />
                </linearGradient>
              ))}
            </defs>
            <SafePie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={86}
              outerRadius={120}
              paddingAngle={2}
              stroke="hsl(var(--card))"
              strokeWidth={2}
              dataKey="value"
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              onMouseEnter={(_: any, i: number) => setActiveIndex(i)}
              label={renderOuterLabel}
              labelLine={false}
              isAnimationActive
              animationDuration={650}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#grad-${index})`}
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

        {/* Center overlay — always-visible context */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {active.name}
          </span>
          <span
            className="mt-1 text-2xl font-bold tabular-nums"
            style={{ color: active.color }}
          >
            {compactFmt(active.value)}
          </span>
          <span className="mt-0.5 text-[11px] text-muted-foreground">
            {activePct.toFixed(1)}% · {active.count} txn
            {active.count !== 1 ? "s" : ""}
          </span>
          <div className="mt-2 h-px w-10 bg-border/60" />
          <span className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            Total
          </span>
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {fmt(total)}
          </span>
        </div>
      </div>

      {/* Top category highlight chip */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <TrendingUp className="h-3.5 w-3.5" style={{ color: top.color }} />
        <span>
          Top spend:{" "}
          <span className="font-semibold text-foreground">{top.name}</span> ·{" "}
          {((top.value / total) * 100).toFixed(0)}% of total
        </span>
      </div>

      {/* Interactive legend with bars — visible context per category */}
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
              className={`group w-full rounded-lg border px-3 py-2 text-left transition-all ${
                isActive
                  ? "border-border bg-muted/40"
                  : "border-border/40 bg-transparent hover:bg-muted/20"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      background: d.color,
                      boxShadow: isActive ? `0 0 8px ${d.color}` : "none",
                    }}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">
                      {d.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {d.count} transaction{d.count !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums text-foreground">
                    {fmt(d.value)}
                  </div>
                  <div className="text-[11px] tabular-nums text-muted-foreground">
                    {pct.toFixed(1)}%
                  </div>
                </div>
              </div>
              {/* progress bar */}
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted/40">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${d.color}, ${d.color}99)`,
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
