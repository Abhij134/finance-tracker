import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import Groq from "groq-sdk";

export const maxDuration = 60;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'MISSING_KEY' });

interface InsightInput {
    transactions: {
        date: string;
        description: string;
        amount: number;
        type: "credit" | "debit";
        category: string;
    }[];
    budgets: {
        category: string;
        limit: number;
        spent: number;
    }[];
    totalBudget: number;
    totalSpent: number;
    totalIncome: number;
    periodStart: string;
    periodEnd: string;
    selectedPeriod: "this_month" | "last_month" | "custom" | "all_time" | string;
}

function buildInsightsPrompt(data: InsightInput): string {
    const today = new Date();
    const start = new Date(data.periodStart);
    const end = new Date(data.periodEnd);

    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const daysElapsed = Math.max(1, Math.min(totalDays, Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))));
    const remainingDays = Math.max(1, totalDays - daysElapsed);
    const remainingBudget = Math.max(0, data.totalBudget - data.totalSpent);
    const dailyAllowance = remainingDays > 0 ? remainingBudget / remainingDays : 0;
    const dailySpendRate = data.totalSpent / daysElapsed;
    const netBalance = data.totalIncome - data.totalSpent;
    const savingsRate = data.totalIncome > 0 ? ((netBalance / data.totalIncome) * 100) : 0;

    // Category spending breakdown
    const categoryBreakdown = data.budgets
        .filter(b => b.spent > 0)
        .sort((a, b) => b.spent - a.spent)
        .map(b => `${b.category}: ₹${b.spent.toLocaleString("en-IN")}${b.limit ? ` / ₹${b.limit.toLocaleString("en-IN")} budget (${Math.round((b.spent / b.limit) * 100)}% used)` : " (no budget set)"}`)
        .join("\n");

    // Over-budget categories
    const overBudget = data.budgets.filter(b => b.limit > 0 && b.spent > b.limit);
    const nearLimit = data.budgets.filter(b => b.limit > 0 && b.spent >= b.limit * 0.8 && b.spent <= b.limit);

    // Top merchants
    const merchantSpend: Record<string, number> = {};
    data.transactions
        .filter(t => t.type === "debit")
        .forEach(t => {
            const key = t.description?.split(" ").slice(0, 3).join(" ") ?? "Unknown";
            merchantSpend[key] = (merchantSpend[key] ?? 0) + t.amount;
        });
    const topMerchants = Object.entries(merchantSpend)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([m, a]) => `${m}: ₹${a.toLocaleString("en-IN")}`)
        .join(", ");

    // Transaction frequency
    const txByDay: Record<string, number> = {};
    data.transactions.forEach(t => {
        const day = t.date?.slice(0, 10) ?? "";
        txByDay[day] = (txByDay[day] ?? 0) + 1;
    });
    const avgTxPerDay = (data.transactions.length / daysElapsed).toFixed(1);

    // UPI transfers
    const upiTransfers = data.transactions.filter(t =>
        t.category === "UPI Transfer" && t.type === "debit"
    );
    const totalUPISent = upiTransfers.reduce((s, t) => s + t.amount, 0);

    return `You are a personal finance AI for an Indian user. Analyze this financial data and generate 5-7 specific, actionable insights.

PERIOD: ${data.periodStart} to ${data.periodEnd} (${totalDays} days total, ${daysElapsed} days elapsed, ${remainingDays} days remaining)
SELECTED PERIOD TYPE: ${data.selectedPeriod}

FINANCIAL SUMMARY:
- Total Income: ₹${data.totalIncome.toLocaleString("en-IN")}
- Total Expenses: ₹${data.totalSpent.toLocaleString("en-IN")}
- Net Balance: ₹${netBalance.toLocaleString("en-IN")} (${savingsRate.toFixed(1)}% savings rate)
- Total Budget: ₹${data.totalBudget.toLocaleString("en-IN")}
- Remaining Budget: ₹${remainingBudget.toLocaleString("en-IN")}
- Daily spend rate: ₹${dailySpendRate.toFixed(0)}/day
- Correct daily allowance for remaining ${remainingDays} days: ₹${dailyAllowance.toFixed(0)}/day
- Total transactions: ${data.transactions.length} (avg ${avgTxPerDay}/day)
- Total UPI transfers sent: ₹${totalUPISent.toLocaleString("en-IN")} across ${upiTransfers.length} transfers

SPENDING BY CATEGORY:
${categoryBreakdown || "No categorized spending yet"}

OVER-BUDGET CATEGORIES: ${overBudget.length > 0 ? overBudget.map(b => `${b.category} (${Math.round((b.spent / b.limit) * 100)}% of budget)`).join(", ") : "None"}
NEAR LIMIT (80%+): ${nearLimit.length > 0 ? nearLimit.map(b => b.category).join(", ") : "None"}

TOP SPENDING MERCHANTS/PAYEES: ${topMerchants || "No data"}

RULES FOR INSIGHTS:
1. NEVER say "Start Tracking" if transactions.length > 0
2. Use ACTUAL numbers from the data above — no generic advice
3. Daily allowance = remaining budget ÷ remaining days = ₹${dailyAllowance.toFixed(0)}/day (NOT total budget ÷ 30)
4. If period is "all_time" or custom with no end date, skip daily allowance insight
5. Be specific: mention actual category names, actual amounts, actual merchants
6. If no budget is set for a category, suggest setting one
7. Detect patterns: is spending accelerating, stable, or slowing down?
8. For UPI transfers > ₹5000 total, mention it

Return ONLY a valid JSON array:
[
  {
    "title": "SHORT TITLE IN CAPS",
    "description": "Specific insight with actual ₹ amounts and percentages",
    "type": "warning|success|info|danger|tip",
    "icon": "trending_up|trending_down|savings|warning|category|calendar|transfer|food|shopping"
  }
]

INSIGHT TYPES TO GENERATE (pick the most relevant 5-7):
- Budget pacing: are they on track for the period?
- Top spending category with actual amount
- Over-budget alert (if any category exceeded)
- Daily allowance (correct calculation for remaining days)
- Savings rate analysis
- UPI transfer pattern (if significant)
- Unusual spike in spending day/week
- Category with no budget set but high spending
- Positive reinforcement if savings rate > 20%
- Warning if projected spending will exceed budget`;
}

// Fallback if AI fails — still uses real data
function getFallbackInsights(data: InsightInput) {
    const today = new Date();
    const start = new Date(data.periodStart);
    const end = new Date(data.periodEnd);
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const daysElapsed = Math.max(1, Math.min(totalDays, Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))));
    const remainingDays = Math.max(1, totalDays - daysElapsed);
    const remainingBudget = Math.max(0, data.totalBudget - data.totalSpent);
    const dailyAllowance = remainingDays > 0 ? remainingBudget / remainingDays : 0;
    const netBalance = data.totalIncome - data.totalSpent;
    const savingsRate = data.totalIncome > 0 ? ((netBalance / data.totalIncome) * 100) : 0;
    const topCategory = data.budgets.sort((a, b) => b.spent - a.spent)[0];

    const insights = [];

    if (remainingBudget > 0 && remainingDays > 0 && data.totalBudget > 0) {
        insights.push({
            title: "DAILY ALLOWANCE",
            description: `You have ₹${remainingBudget.toLocaleString("en-IN")} remaining over ${remainingDays} days — spend ₹${Math.round(dailyAllowance).toLocaleString("en-IN")}/day to stay on budget.`,
            type: "info",
            icon: "calendar",
        });
    }

    if (topCategory?.spent > 0) {
        insights.push({
            title: "TOP SPENDING CATEGORY",
            description: `${topCategory.category} is your biggest expense at ₹${topCategory.spent.toLocaleString("en-IN")}${topCategory.limit ? ` — ${Math.round((topCategory.spent / topCategory.limit) * 100)}% of your ₹${topCategory.limit.toLocaleString("en-IN")} budget` : ""}.`,
            type: topCategory.limit && topCategory.spent > topCategory.limit ? "warning" : "info",
            icon: "category",
        });
    }

    if (savingsRate < 0) {
        insights.push({
            title: "NEGATIVE SAVINGS RATE",
            description: `You've spent ₹${Math.abs(netBalance).toLocaleString("en-IN")} more than your income this period. Review your ${topCategory?.category ?? "top"} expenses.`,
            type: "danger",
            icon: "warning",
        });
    } else if (savingsRate > 20) {
        insights.push({
            title: "GREAT SAVINGS",
            description: `You're saving ${savingsRate.toFixed(1)}% of your income this period — ₹${netBalance.toLocaleString("en-IN")} saved so far.`,
            type: "success",
            icon: "savings",
        });
    }

    return insights;
}

export async function GET(req: Request) {
    try {
        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!dbUser) {
            return NextResponse.json({ error: "User not found in database" }, { status: 404 });
        }

        // Parse filters
        const url = new URL(req.url);
        const fromParam = url.searchParams.get("from");
        const toParam = url.searchParams.get("to");
        const rangeParam = url.searchParams.get("range") || "month";

        let dateFilter = {};
        let periodStart = new Date().toISOString().slice(0, 10);
        let periodEnd = new Date().toISOString().slice(0, 10);

        if (fromParam && toParam) {
            const start = new Date(fromParam);
            const end = new Date(toParam);
            end.setHours(23, 59, 59, 999);
            dateFilter = { date: { gte: start, lte: end } };
            periodStart = start.toISOString().slice(0, 10);
            periodEnd = end.toISOString().slice(0, 10);
        } else {
            // Default: Current month
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            dateFilter = { date: { gte: startOfMonth, lte: endOfMonth } };
            periodStart = startOfMonth.toISOString().slice(0, 10);
            periodEnd = endOfMonth.toISOString().slice(0, 10);
        }

        // Fetch filtered transactions and budgets in parallel
        const [allTxs, dbBudgets] = await Promise.all([
            prisma.transaction.findMany({ where: { userId: dbUser.id, ...dateFilter }, orderBy: { date: 'desc' } }),
            prisma.budget.findMany({ where: { userId: dbUser.id } })
        ]);

        // Transform data to InsightInput format
        const totalIncome = allTxs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
        const totalSpent = allTxs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

        const catSpent: Record<string, number> = {};
        allTxs.filter(t => t.amount < 0).forEach(t => {
            catSpent[t.category] = (catSpent[t.category] || 0) + Math.abs(t.amount);
        });

        const formattedBudgets = dbBudgets.filter(b => b.category !== 'OVERALL').map(b => ({
            category: b.category,
            limit: b.amount,
            spent: catSpent[b.category] || 0,
        }));

        // Add categories with spending but no budget set
        Object.entries(catSpent).forEach(([cat, amount]) => {
            if (!formattedBudgets.some(b => b.category === cat)) {
                formattedBudgets.push({ category: cat, limit: 0, spent: amount });
            }
        });

        const overallBudget = dbBudgets.find(b => b.category === "OVERALL")?.amount || 0;
        const totalBudget = overallBudget > 0 ? overallBudget : formattedBudgets.reduce((s, b) => s + b.limit, 0);

        const data: InsightInput = {
            transactions: allTxs.map(t => ({
                date: t.date.toISOString(),
                description: t.merchant || "Unknown",
                amount: Math.abs(t.amount),
                type: t.amount < 0 ? "debit" : "credit",
                category: t.category,
            })),
            budgets: formattedBudgets,
            totalBudget,
            totalSpent,
            totalIncome,
            periodStart,
            periodEnd,
            selectedPeriod: rangeParam,
        };

        if (data.transactions.length === 0) {
            return NextResponse.json({
                insights: [{
                    title: "NO TRANSACTIONS YET",
                    description: `Upload a bank statement or add transactions manually to get personalized insights for this period.`,
                    type: "info",
                    icon: "calendar",
                }]
            });
        }

        const prompt = buildInsightsPrompt(data);

        try {
            const response = await groq.chat.completions.create({
                model: "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "system",
                        content: "You are a precise financial analyst. Always use exact numbers from the data provided. Return only valid JSON.",
                    },
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                temperature: 0.3,
                max_tokens: 2048,
            });

            const raw = response.choices?.[0]?.message?.content ?? "[]";
            const s = raw.indexOf("[");
            const e = raw.lastIndexOf("]");

            let insights = [];
            if (s !== -1 && e !== -1 && e > s) {
                const parsed = JSON.parse(raw.slice(s, e + 1));
                insights = Array.isArray(parsed) ? parsed : getFallbackInsights(data);
            } else {
                insights = getFallbackInsights(data);
            }

            return NextResponse.json({ insights });
        } catch (err) {
            console.error("[generateInsights] error:", err);
            return NextResponse.json({ insights: getFallbackInsights(data) });
        }

    } catch (error) {
        console.error("AI Insights route error:", error);
        return NextResponse.json({ error: "Internal Server Error." }, { status: 500 });
    }
}
