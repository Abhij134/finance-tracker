import { auth } from "@/auth";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import prisma from "@/lib/prisma";

export const maxDuration = 60;

const novita = new OpenAI({
    apiKey: process.env.NOVITA_API_KEY || 'MISSING_KEY',
    baseURL: 'https://api.novita.ai/v3/openai',
});

const openrouter = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY || 'MISSING_KEY',
    baseURL: 'https://openrouter.ai/api/v1',
});

function extractInsightsArray(raw: string): any[] {
    const text = raw.trim();
    try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed;
        for (const key of Object.keys(parsed)) {
            if (Array.isArray(parsed[key])) return parsed[key];
        }
    } catch { /* fall through */ }
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start !== -1 && end !== -1 && end > start) {
        try { return JSON.parse(text.substring(start, end + 1)); } catch { /* ignore */ }
    }
    throw new Error("Could not parse insights array from model response");
}

function computeAnalytics(transactions: any[], budgets: any[]) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysRemaining = daysInMonth - dayOfMonth;
    const fmt = (n: number) => `₹${Math.abs(Math.round(n)).toLocaleString('en-IN')}`;

    const expenses = transactions.filter(t => t.amount < 0);
    const income = transactions.filter(t => t.amount > 0);
    const totalExpenses = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);
    const totalIncome = income.reduce((s, t) => s + t.amount, 0);

    const monthlyData: Record<string, { income: number; expense: number; count: number }> = {};
    transactions.forEach(tx => {
        const d = new Date(tx.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[key]) monthlyData[key] = { income: 0, expense: 0, count: 0 };
        if (tx.amount > 0) monthlyData[key].income += tx.amount;
        else monthlyData[key].expense += Math.abs(tx.amount);
        monthlyData[key].count++;
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    const lastNMonths = sortedMonths.slice(-3);
    const monthlyTrend = lastNMonths.map(m => ({
        month: m,
        income: Math.round(monthlyData[m].income),
        expense: Math.round(monthlyData[m].expense),
        net: Math.round(monthlyData[m].income - monthlyData[m].expense),
        txCount: monthlyData[m].count,
    }));

    const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const thisMonth = monthlyData[currentMonthKey] || { income: 0, expense: 0, count: 0 };
    const dailyBurnRate = dayOfMonth > 0 ? thisMonth.expense / dayOfMonth : 0;
    const projectedMonthEnd = dailyBurnRate * daysInMonth;

    const catSpend: Record<string, number> = {};
    expenses.forEach(tx => {
        const d = new Date(tx.date);
        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
            catSpend[tx.category] = (catSpend[tx.category] || 0) + Math.abs(tx.amount);
        }
    });
    const topCategories = Object.entries(catSpend)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat, amt]) => ({ category: cat, spent: Math.round(amt), pct: totalExpenses > 0 ? Math.round((amt / thisMonth.expense) * 100) : 0 }));

    const overallBudget = budgets.find((b: any) => b.category === "OVERALL")?.amount ?? 0;
    const categoryBudgets = budgets.filter((b: any) => b.category !== "OVERALL");

    const budgetAnalysis: { category: string; budget: number; spent: number; pct: number; status: string; daysToOverspend?: number }[] = [];

    if (overallBudget > 0) {
        const overallPct = Math.round((thisMonth.expense / overallBudget) * 100);
        const overallDaysToOverspend = dailyBurnRate > 0 ? Math.round((overallBudget - thisMonth.expense) / dailyBurnRate) : 999;
        budgetAnalysis.push({
            category: 'OVERALL',
            budget: overallBudget,
            spent: Math.round(thisMonth.expense),
            pct: overallPct,
            status: overallPct >= 100 ? 'OVERSPENT' : overallPct >= 80 ? 'WARNING' : 'SAFE',
            daysToOverspend: overallDaysToOverspend > 0 ? overallDaysToOverspend : 0,
        });
    }

    categoryBudgets.forEach((b: any) => {
        const spent = catSpend[b.category] || 0;
        const pct = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
        const dailyCatBurn = dayOfMonth > 0 ? spent / dayOfMonth : 0;
        const daysToOverspend = dailyCatBurn > 0 ? Math.round((b.amount - spent) / dailyCatBurn) : 999;
        budgetAnalysis.push({
            category: b.category,
            budget: b.amount,
            spent: Math.round(spent),
            pct,
            status: pct >= 100 ? 'OVERSPENT' : pct >= 80 ? 'WARNING' : 'SAFE',
            daysToOverspend: daysToOverspend > 0 ? daysToOverspend : 0,
        });
    });

    const merchantFreq: Record<string, { count: number; total: number }> = {};
    expenses.forEach(tx => {
        const m = tx.merchant?.toLowerCase().trim();
        if (!m) return;
        if (!merchantFreq[m]) merchantFreq[m] = { count: 0, total: 0 };
        merchantFreq[m].count++;
        merchantFreq[m].total += Math.abs(tx.amount);
    });
    const frequentMerchants = Object.entries(merchantFreq)
        .filter(([, v]) => v.count >= 3)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5)
        .map(([name, v]) => ({ merchant: name, visits: v.count, totalSpent: Math.round(v.total), avgPerVisit: Math.round(v.total / v.count) }));

    const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0;

    return {
        summary: {
            totalTransactions: transactions.length,
            totalIncome: fmt(totalIncome),
            totalExpenses: fmt(totalExpenses),
            netBalance: fmt(totalIncome - totalExpenses),
            netPositive: totalIncome >= totalExpenses,
            savingsRate: `${savingsRate}%`,
        },
        currentMonth: {
            month: currentMonthKey,
            dayOfMonth,
            daysRemaining,
            spent: fmt(thisMonth.expense),
            earned: fmt(thisMonth.income),
            dailyBurnRate: fmt(dailyBurnRate),
            projectedMonthEnd: fmt(projectedMonthEnd),
            txCount: thisMonth.count,
        },
        monthlyTrend,
        topCategories,
        budgetAnalysis,
        frequentMerchants,
    };
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

        // Optional range or month filters
        const url = new URL(req.url);
        const fromParam = url.searchParams.get("from");
        const toParam = url.searchParams.get("to");
        const monthParam = url.searchParams.get("month"); // e.g. "2026-02" (legacy support/shorthand)
        const dailyAllowanceParam = url.searchParams.get("dailyAllowance");
        const daysLeftParam = url.searchParams.get("daysLeft");

        const dailyAllowance = dailyAllowanceParam ? parseFloat(dailyAllowanceParam) : 0;
        const daysLeft = daysLeftParam ? parseInt(daysLeftParam) : 1;

        let dateFilter = {};
        let rangeLabel = "current month";

        if (fromParam && toParam) {
            // Priority: Explicit range
            const start = new Date(fromParam);
            const end = new Date(toParam);
            end.setHours(23, 59, 59, 999);
            dateFilter = { date: { gte: start, lte: end } };
            rangeLabel = `${fromParam} to ${toParam}`;
        } else if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
            const [year, month] = monthParam.split('-').map(Number);
            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
            dateFilter = { date: { gte: startOfMonth, lte: endOfMonth } };
            rangeLabel = new Date(monthParam + '-01').toLocaleString('en-IN', { month: 'long', year: 'numeric' });
        } else {
            // Default: Current month
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            dateFilter = { date: { gte: startOfMonth, lte: endOfMonth } };
        }

        // Fetch filtered transactions and budgets in parallel
        const [allTxs, budgets] = await Promise.all([
            prisma.transaction.findMany({ where: { userId: dbUser.id, ...dateFilter }, orderBy: { date: 'desc' } }),
            prisma.budget.findMany({ where: { userId: dbUser.id } })
        ]);

        const analytics = computeAnalytics(allTxs, budgets);

        // 3. Burn Rate Velocity Engine
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const currentDay = now.getDate();
        const timeElapsedPct = currentDay / daysInMonth;

        // Calculate budget consumption (Overall budget preferred)
        const overallBudget = budgets.find((b: any) => b.category === "OVERALL")?.amount ||
            budgets.reduce((acc, b) => acc + b.amount, 0);

        const totalExpenses = allTxs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
        const budgetConsumedPct = overallBudget > 0 ? totalExpenses / overallBudget : 0;

        const velocityGap = budgetConsumedPct - timeElapsedPct;
        const isOverspendingVelocity = velocityGap > 0.1; // 10% margin

        const projectedTotal = timeElapsedPct > 0 ? (totalExpenses / timeElapsedPct) : totalExpenses;
        const overspendAmount = overallBudget > 0 ? Math.max(0, projectedTotal - overallBudget) : 0;

        const velocityPrompt = isOverspendingVelocity
            ? `\nCRITICAL VELOCITY WARNING: The user has consumed ${Math.round(budgetConsumedPct * 100)}% of their budget while only ${Math.round(timeElapsedPct * 100)}% of the month has passed. At this "burn rate", they will overspend by ₹${Math.round(overspendAmount)} by month-end. WARN THEM AGGRESSIVELY.`
            : `\nSpending Velocity: Stable. (${Math.round(budgetConsumedPct * 100)}% budget vs ${Math.round(timeElapsedPct * 100)}% time).`;

        const monthLabel = rangeLabel;

        if (allTxs.length === 0) {
            return NextResponse.json({
                insights: [{
                    type: "opportunity",
                    priority: "low",
                    title: "No Transactions Found",
                    msg: `No transactions found for ${monthLabel}. Add or scan transactions to get AI insights.`,
                    action: null
                }]
            });
        }

        const systemPrompt = `You are a concise, logical financial analyzer for FinanceNeo. Analyze transactions for ${rangeLabel}.

OVERVIEW: ${JSON.stringify(analytics.summary)}
TIME PERIOD: ${daysLeft} days remaining. Spent: ₹${analytics.currentMonth.spent}, Earned: ₹${analytics.currentMonth.earned}.
BURN RATE: ₹${analytics.currentMonth.dailyBurnRate}/day vs ALLOWANCE: ₹${Math.round(dailyAllowance)}/day.
VELOCITY: ${velocityPrompt}
BUDGETS: ${analytics.budgetAnalysis.length > 0 ? JSON.stringify(analytics.budgetAnalysis) : 'None set.'}

INSTRUCTIONS:
1. FIRST INSIGHT (Type: allowance): Compare Burn vs Allowance. IF SPENDING IS ₹0, provide encouraging "Getting Started" advice or a budget-setting tip. DO NOT do math projections for ₹0 spending.
2. NEXT 2 INSIGHTS (Type: pattern|forecast|health): Highlight one specific numeric trend or a risk.
3. CONCISE: Exactly 30-40 words per "msg". No fluff. No professional jargon like "substantial buffer".
4. PUNCHY: Use direct, actionable language. No bullet points or hyphens.
5. PRIORITY: High only for active overspending or zero balance risk.

Return ONLY a JSON array of 3 objects:
{"type":"allowance|alert|forecast|pattern|health","priority":"high|mid|low","title":"Short Title","msg":"[30-40 words of logical, punchy insight]"}`;

        const callAI = async (client: OpenAI, model: string, maxTokens: number): Promise<any[]> => {
            const response = await client.chat.completions.create({
                model,
                messages: [{ role: "user", content: systemPrompt }],
                max_tokens: maxTokens,
                temperature: 0.3,
            });
            const raw = response.choices[0].message.content || "[]";
            return extractInsightsArray(raw);
        };

        try {
            // console.log('[insights] Calling Novita AI...');
            const insights = await callAI(novita, 'qwen/qwen-2.5-72b-instruct', 500);
            // console.log(`[insights] Got ${insights.length} insights from Novita`);
            return NextResponse.json({ insights });
        } catch (novitaError) {
            console.warn("Novita insights failed, trying OpenRouter fallback:", novitaError);
            try {
                const insights = await callAI(openrouter, 'meta-llama/llama-3.1-8b-instruct:free', 500);
                return NextResponse.json({ insights });
            } catch (fallbackError) {
                console.error("Both AI providers failed for insights:", fallbackError);
                return NextResponse.json({ error: "AI providers unavailable." }, { status: 503 });
            }
        }

    } catch (error) {
        console.error("AI Insights route error:", error);
        return NextResponse.json({ error: "Internal Server Error." }, { status: 500 });
    }
}
