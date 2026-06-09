import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

const insightsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface InsightInput {
    transactions: { date: string; description: string; amount: number; type: "credit" | "debit"; category: string; }[];
    budgets: { category: string; limit: number; spent: number; }[];
    totalBudget: number;
    totalSpent: number;
    totalIncome: number;
    periodStart: string;
    periodEnd: string;
    selectedPeriod: string;
}

function inr(n: number): string {
    return `₹${Math.round(Math.abs(n)).toLocaleString("en-IN")}`;
}

function buildInsightsPrompt(data: InsightInput): string {
    const today = new Date();
    const start = new Date(data.periodStart);
    const end = new Date(data.periodEnd);

    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    const daysElapsed = Math.max(1, Math.min(totalDays, Math.ceil((today.getTime() - start.getTime()) / 86400000)));
    const daysRemaining = Math.max(0, totalDays - daysElapsed);
    const dailySpendRate = data.totalSpent / daysElapsed;
    const projectedMonthEnd = dailySpendRate * totalDays;
    const estimatedSavings = data.totalBudget - projectedMonthEnd;
    const topSpendCat = [...data.budgets].sort((a, b) => b.spent - a.spent)[0];

    // Category context — human-readable, no raw percentages
    const catContext = data.budgets
        .filter(b => b.spent > 0)
        .sort((a, b) => b.spent - a.spent)
        .slice(0, 12)
        .map(b => {
            const remaining = b.limit > 0 ? b.limit - b.spent : null;
            const daysUntilExceeded = b.limit > 0 && dailySpendRate > 0
                ? Math.round(remaining! / (b.spent / daysElapsed))
                : null;
            return `  ${b.category}: spent ${inr(b.spent)}${b.limit > 0
                ? `, budget ${inr(b.limit)}, ${remaining! > 0 ? inr(remaining!) + " left" : inr(Math.abs(remaining!)) + " over"}`
                : " (no budget)"}${daysUntilExceeded !== null && daysUntilExceeded > 0 && daysUntilExceeded <= daysRemaining ? `, may exceed in ~${daysUntilExceeded} days` : ""}`;
        })
        .join("\n");

    const overBudget = data.budgets.filter(b => b.limit > 0 && b.spent > b.limit);
    const nearLimit = data.budgets.filter(b => b.limit > 0 && b.spent >= b.limit * 0.8 && b.spent <= b.limit);

    return `You are a smart personal finance advisor for an Indian user using FinanceNeo.
Analyze their spending data and give SHORT, HUMAN, CONVERSATIONAL insights.

FINANCIAL SNAPSHOT:
- Period: ${data.periodStart} to ${data.periodEnd} (${daysElapsed} days elapsed, ${daysRemaining} days left)
- Total spent so far: ${inr(data.totalSpent)}
- Daily spend rate: ${inr(dailySpendRate)}/day
- Projected month-end total: ${inr(projectedMonthEnd)}
- Total budget: ${inr(data.totalBudget)}
- Estimated savings vs budget: ${estimatedSavings >= 0 ? inr(estimatedSavings) + " under" : inr(Math.abs(estimatedSavings)) + " over"}
- Income this period: ${data.totalIncome > 0 ? inr(data.totalIncome) : "not tracked"}
- Top spending category: ${topSpendCat?.category ?? "N/A"} at ${inr(topSpendCat?.spent ?? 0)}

CATEGORY BREAKDOWN:
${catContext || "No spending yet"}

ALERT FLAGS:
- Over budget: ${overBudget.length > 0 ? overBudget.map(b => `${b.category} (${inr(b.spent - b.limit)} over)`).join(", ") : "none"}
- Near limit: ${nearLimit.length > 0 ? nearLimit.map(b => b.category).join(", ") : "none"}

STRICT TONE RULES — YOU MUST FOLLOW THESE:
1. Write like a smart friend, NOT like a spreadsheet
2. NO percentage numbers in the message text AT ALL (not even "X% of your budget")
3. NO "₹X out of ₹Y" breakdowns in message text
4. Each message must be MAX 2 short sentences
5. Be direct, warm, and specific with ₹ amounts only where it adds real value
6. Focus on what the user should DO, not just what already happened
7. NEVER generate vague advice like "consider setting a budget" or "track your expenses"
8. Use Indian app names where natural: Swiggy, Zomato, Zepto, BigBasket, Amazon, Flipkart

INSIGHT TYPES — pick the most relevant 5-6 only:

1. MONTH FORECAST (always include)
   Focus: Will they save or overspend? By how much?
   Good example: "You're on track to save around ₹22,000 this month. Keep your daily spending under ₹300 to hit that goal."
   Bad example:  "Projected spend is ₹7,388 which is 25% of your ₹30,000 budget."

2. BIGGEST RISK (always include if any category is above 40% used)
   Focus: Which category will blow the budget first?
   Good example: "Shopping is your fastest-growing expense this month. At this pace, you'll exceed that budget in about 9 days."
   Bad example:  "Shopping spend is 46% of your ₹1,000 budget with ₹536 remaining."

3. SMART SAVING TIP (always include)
   Focus: One specific, actionable thing they can do THIS WEEK
   Good example: "Cutting 2-3 UPI food orders this week could save you around ₹400-600 before month end."
   Bad example:  "Consider reducing non-essential purchases."

4. POSITIVE WIN (include if any category is well under budget)
   Focus: Celebrate something they're doing well — makes the app feel supportive
   Good example: "Great job on Fuel this month — you're well within budget and still have plenty left for the rest of the month."
   Bad example:  "Fuel & Auto is 14% of your ₹2,500 budget."

5. SAVINGS FORECAST (only if income data is available)
   Focus: End-of-month savings prediction in ₹, not %
   Good example: "Based on your income and spending, you could save around ₹18,000 by the 31st if you stay consistent."
   Bad example:  "Savings rate is -4145.8% indicating a deficit."

6. OVERSPEND WARNING (only if a category has already exceeded budget)
   Focus: What happened and quick recovery tip
   Good example: "You've gone over your Education budget this month. Try pausing any new subscriptions or courses until next month."
   Bad example:  "Education spend exceeded budget by 120%."

NEVER generate:
- Any insight with a % number in the message text
- Any insight that just lists "₹X out of ₹Y remaining"
- More than 6 insights total
- Vague advice like "consider setting a budget" or "track your expenses"
- Duplicate insights about the same category

SEVERITY (used for card color/icon only, not shown in text):
- "critical"  → already overspent OR forecast to overspend this month
- "warning"   → within ₹500 of budget limit in any category  
- "positive"  → saving well, on track
- "info"      → neutral observation or tip

RETURN ONLY a valid JSON array, no markdown wrapping:
[
  {
    "type": "forecast" | "risk" | "tip" | "win" | "savings" | "overspend",
    "title": "2-3 WORD TITLE IN CAPS",
    "message": "Human, conversational insight. Max 2 sentences. No percentages.",
    "severity": "critical" | "warning" | "positive" | "info",
    "icon": "calendar" | "shopping-bag" | "piggy-bank" | "alert-triangle" | "trending-up" | "trending-down" | "arrow-left-right" | "tag" | "star"
  }
]`;
}

// Deterministic fallback — no AI needed
function getFallbackInsights(data: InsightInput) {
    const today = new Date();
    const start = new Date(data.periodStart);
    const end = new Date(data.periodEnd);
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    const daysElapsed = Math.max(1, Math.min(totalDays, Math.ceil((today.getTime() - start.getTime()) / 86400000)));
    const daysRemaining = Math.max(0, totalDays - daysElapsed);
    const dailySpendRate = data.totalSpent / daysElapsed;
    const projectedSpend = dailySpendRate * totalDays;
    const netBalance = data.totalIncome - data.totalSpent;
    const hasSavingsData = data.totalIncome > 0;

    const overBudgetCat = data.budgets.filter(b => b.limit > 0 && b.spent > b.limit)[0];
    const insights: any[] = [];

    // 1. Forecast (always)
    if (data.totalBudget > 0 && daysRemaining > 0) {
        const willSave = projectedSpend <= data.totalBudget;
        const diff = Math.abs(projectedSpend - data.totalBudget);
        insights.push({
            type: "forecast",
            title: "MONTH FORECAST",
            message: `You're on track to ${willSave ? "save" : "overspend by"} around ${inr(diff)} this month. Try to keep daily expenses under ${inr(dailySpendRate)} to stay steady.`,
            severity: willSave ? "positive" : projectedSpend > data.totalBudget * 1.2 ? "critical" : "warning",
            icon: "calendar",
        });
    }

    // 2. Over-budget alert
    if (overBudgetCat) {
        insights.push({
            type: "overspend",
            title: "BUDGET EXCEEDED",
            message: `You've gone over your ${overBudgetCat.category} limit. Hold off on extra spending here until the month resets.`,
            severity: "critical",
            icon: "alert-triangle",
        });
    }

    // 3. Savings (only if income exists)
    if (hasSavingsData) {
        const projectedSavings = data.totalIncome - projectedSpend;
        insights.push({
            type: "savings",
            title: projectedSavings < 0 ? "SAVINGS ALERT" : "SAVINGS FORECAST",
            message: projectedSavings < 0
                ? `You're projected to spend more than you earn by month end. See where you can cut back quickly.`
                : `Based on your income, you could stash away ${inr(projectedSavings)} by month end if you keep this up.`,
            severity: projectedSavings < 0 ? "critical" : "positive",
            icon: projectedSavings >= 0 ? "piggy-bank" : "trending-down",
        });
    }

    return insights;
}

function safeParseInsights(raw: string): any[] | null {
    try {
        const s = raw.indexOf("[");
        const e = raw.lastIndexOf("]");
        if (s === -1 || e === -1 || e <= s) return null;
        const parsed = JSON.parse(raw.slice(s, e + 1));
        if (!Array.isArray(parsed) || parsed.length === 0) return null;
        return parsed;
    } catch {
        return null;
    }
}

export async function GET(req: Request) {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const dbUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // Parse date params
        const url = new URL(req.url);
        const fromParam = url.searchParams.get("from");
        const toParam = url.searchParams.get("to");
        const rangeParam = url.searchParams.get("range") || "month";

        const hour = new Date().toISOString().slice(0, 13);
        const cacheKey = `insights:${fromParam || 'none'}:${toParam || 'none'}:${hour}`;

        const cached = insightsCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
            return NextResponse.json(cached.data, {
                headers: {
                    "Cache-Control": "private, max-age=3600, stale-while-revalidate=7200",
                }
            });
        }

        let dateFilter: any = {};
        let periodStart: string;
        let periodEnd: string;

        if (fromParam && toParam) {
            const start = new Date(fromParam);
            const end = new Date(toParam);
            end.setHours(23, 59, 59, 999);
            dateFilter = { date: { gte: start, lte: end } };
            periodStart = start.toISOString().slice(0, 10);
            periodEnd = end.toISOString().slice(0, 10);
        } else {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            dateFilter = { date: { gte: startOfMonth, lte: endOfMonth } };
            periodStart = startOfMonth.toISOString().slice(0, 10);
            periodEnd = endOfMonth.toISOString().slice(0, 10);
        }

        const [allTxs, dbBudgets] = await Promise.all([
            prisma.transaction.findMany({ where: { userId: dbUser.id, ...dateFilter }, orderBy: { date: "desc" } }),
            prisma.budget.findMany({ where: { userId: dbUser.id } }),
        ]);

        const totalIncome = allTxs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
        const totalSpent = allTxs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

        const catSpent: Record<string, number> = {};
        allTxs.filter(t => t.amount < 0).forEach(t => {
            catSpent[t.category] = (catSpent[t.category] || 0) + Math.abs(t.amount);
        });

        const formattedBudgets = dbBudgets.filter(b => b.category !== "OVERALL").map(b => ({
            category: b.category,
            limit: b.amount,
            spent: catSpent[b.category] || 0,
        }));

        // Add unbudgeted categories with spending > ₹500
        Object.entries(catSpent).forEach(([cat, amount]) => {
            if (!formattedBudgets.some(b => b.category === cat) && amount > 500) {
                formattedBudgets.push({ category: cat, limit: 0, spent: amount });
            }
        });

        const overallBudget = dbBudgets.find(b => b.category === "OVERALL")?.amount || 0;
        const totalBudget = overallBudget > 0 ? overallBudget : formattedBudgets.reduce((s, b) => s + b.limit, 0);

        // Summarize transactions (max 50) for AI
        const txSummary = allTxs.slice(0, 50).map(t => ({
            date: t.date.toISOString().slice(0, 10),
            description: t.merchant || "Unknown",
            amount: Math.abs(t.amount),
            type: t.amount < 0 ? "debit" as const : "credit" as const,
            category: t.category,
        }));

        const data: InsightInput = {
            transactions: txSummary,
            budgets: formattedBudgets,
            totalBudget,
            totalSpent,
            totalIncome,
            periodStart,
            periodEnd,
            selectedPeriod: rangeParam,
        };

        if (allTxs.length === 0) {
            return NextResponse.json({
                insights: [{
                    type: "info",
                    title: "NO TRANSACTIONS YET",
                    message: "Upload a bank statement or add transactions manually to get personalized AI insights.",
                    severity: "info",
                    icon: "calendar",
                }]
            });
        }

        const prompt = buildInsightsPrompt(data);

        try {
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash-lite",
                generationConfig: { temperature: 0.4 },
            });
            const result = await model.generateContent(prompt);
            const raw = result.response.text();
            const parsed = safeParseInsights(raw);
            const insights = parsed ?? getFallbackInsights(data);
            
            const resultData = { insights };
            insightsCache.set(cacheKey, { data: resultData, timestamp: Date.now() });
            
            for (const [key, val] of insightsCache.entries()) {
                if (Date.now() - val.timestamp > CACHE_TTL_MS * 2) {
                    insightsCache.delete(key);
                }
            }

            return NextResponse.json(resultData, {
                headers: {
                    "Cache-Control": "private, max-age=3600, stale-while-revalidate=7200",
                }
            });
        } catch (err: any) {
            console.error("[insights route] Gemini error:", err);
            if (err.status === 429) {
                return NextResponse.json({ 
                    insights: getFallbackInsights(data), 
                    cached: false, 
                    rateLimited: true 
                }, {
                    headers: {
                        "Cache-Control": "private, max-age=3600, stale-while-revalidate=7200",
                    }
                });
            }
            return NextResponse.json({ insights: getFallbackInsights(data) });
        }

    } catch (error) {
        console.error("[insights route] fatal:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
