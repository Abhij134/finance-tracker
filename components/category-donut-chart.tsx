"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { CATEGORIES } from "../lib/constants";

// Map category labels to their theme colors using a consistent mapping
const CAT_COLORS: Record<string, string> = {
  UPI: "#3B82F6", // Blue
  Foods: "#10B981", // Emerald Neon
  Entertainment: "#8B5CF6", // Violet
  Shopping: "#EC4899", // Pink Neon
  Transport: "#F97316", // Orange Neon
  Health: "#06B6D4", // Cyan
  Utilities: "#EAB308", // Yellow
  Other: "#64748B", // Slate
};

const fmt = (n: number) =>
  Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

interface CategoryDonutChartProps {
  filteredTransactions: any[];
}

export function CategoryDonutChart({ filteredTransactions }: CategoryDonutChartProps) {
  const data = useMemo(() => {
    // Only chart expenses
    const expenses = filteredTransactions.filter(t => t.amount < 0);

    // Group by category label
    const grouped = expenses.reduce((acc, tx) => {
      const cat = tx.category.label;
      if (!acc[cat]) acc[cat] = 0;
      acc[cat] += Math.abs(tx.amount);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value); // sort largest to smallest
  }, [filteredTransactions]);

  if (filteredTransactions.length === 0 || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full flex-1 w-full text-muted-foreground border border-dashed border-border/50 rounded-xl bg-muted/10 p-6 min-h-[350px]">
        <PieChart className="w-12 h-12 mb-4 opacity-20" />
        <p>No expense data for this period.</p>
        <p className="text-sm opacity-70 text-center max-w-xs mt-1">Select a different date range or add transactions.</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 350 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={120}
            fill="#8884d8"
            paddingAngle={5}
            stroke="#0f172a"
            strokeWidth={3}
            dataKey="value"
            labelLine={false}
            label={({ name, percent }) => percent ? `${name} ${(percent * 100).toFixed(0)}%` : name}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={CAT_COLORS[entry.name] || "#8884d8"} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: any) => [fmt(Number(value)), "Spent"]}
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "12px",
              fontSize: "13px",
              color: "hsl(var(--foreground))",
              boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)"
            }}
            itemStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
