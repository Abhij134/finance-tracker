import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail, buildWeeklySummaryHTML } from '@/lib/email';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

// Ensure the route is evaluated dynamically
export const dynamic = 'force-dynamic';

// Map JS getDay() (0=Sun…6=Sat) to Prisma DayOfWeek enum values
const DAY_MAP: Record<number, string> = {
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
};

export async function GET(req: Request) {
  // 1. Secure the cron endpoint — Netlify function sends x-cron-secret header
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 2. Determine today's day of the week as a DayOfWeek enum string
    const todayIndex = new Date().getDay(); // 0 (Sun) – 6 (Sat)
    const today = DAY_MAP[todayIndex]; // e.g. "MONDAY"

    // 3. Fetch only users who want the weekly summary AND have today set as their summary day
    const users = await prisma.user.findMany({
      where: {
        periodicSummaryEmailEnabled: true,
        summaryDay: today as any,
        email: { not: '' },
      },
      select: {
        id: true,
        email: true,
        name: true,
        budgets: true,
      },
    });

    if (users.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No users scheduled for ${today}.`,
      });
    }

    // Identify the date range: Last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 4. Process each user and send emails concurrently
    const results = await Promise.allSettled(
      users.map(async (user) => {
        const txs = await prisma.transaction.findMany({
          where: {
            userId: user.id,
            date: { gte: sevenDaysAgo },
          },
          select: { amount: true, category: true },
        });

        const totalSpent = txs.reduce((sum, tx) => sum + (tx.amount < 0 ? Math.abs(tx.amount) : 0), 0);
        const budgetLimit = user.budgets.reduce((sum, b) => sum + b.amount, 0);

        // Get top categories
        const categoryTotals: Record<string, number> = {};
        txs.filter(tx => tx.amount < 0).forEach(tx => {
          categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + Math.abs(tx.amount);
        });

        const topCategories = Object.entries(categoryTotals)
          .map(([name, amount]) => ({ name, amount }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 3); // Top 3 categories

        // Generate AI Advice
        let aiAdvice = "";
        if (totalSpent > 0 && process.env.GOOGLE_GEMINI_API_KEY) {
          try {
            const catText = topCategories.map(c => `${c.name}: ₹${Math.round(c.amount)}`).join(", ");
            const prompt = `You are a smart, friendly financial advisor. Based on this user's last 7 days of spending, give ONE short, conversational sentence of advice (max 20 words) on how they can save money next week. Do NOT use any percentages. Keep it warm and actionable. 
Data: Total spent ₹${Math.round(totalSpent)}. Top expenses: ${catText}.`;
            
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite", generationConfig: { temperature: 0.5 } });
            const result = await model.generateContent(prompt);
            aiAdvice = result.response.text().trim().replace(/^["']|["']$/g, '');
          } catch (err) {
            console.error("AI Advice generation failed for cron:", err);
          }
        }

        const html = buildWeeklySummaryHTML(
          totalSpent,
          budgetLimit > 0 ? budgetLimit : null,
          user.name || 'FinanceNeo User',
          topCategories,
          aiAdvice
        );

        await sendEmail({
          to: user.email,
          subject: 'Your FinanceNeo Weekly Summary',
          html,
        });

        return { userId: user.id, status: 'sent' };
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    return NextResponse.json({
      success: true,
      message: `Weekly summaries sent to ${successful}/${users.length} users (${today}).`,
    });
  } catch (error: any) {
    console.error('Weekly summary cron error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
