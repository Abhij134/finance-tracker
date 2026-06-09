import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail, buildWeeklySummaryHTML } from '@/lib/email';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

// DEV-ONLY: Test route to manually trigger weekly summary email
// This sends the summary to YOUR account only — no auth required
// Remove this file before production!

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return new Response('Not found', { status: 404 });
  }

  const url = new URL(req.url);
  const targetEmail = url.searchParams.get('email') || process.env.GMAIL_USER;

  try {
    // Find the user by email
    const user = await prisma.user.findFirst({
      where: { email: targetEmail! },
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: `No user found with email: ${targetEmail}`,
      }, { status: 404 });
    }

    // Last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get transactions
    const txs = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: { gte: sevenDaysAgo },
      },
      select: { amount: true, category: true },
    });

    const budgets = await prisma.budget.findMany({
      where: { userId: user.id },
      select: { amount: true },
    });

    // Calculate total spent
    const totalSpent = txs.reduce((sum, tx) => sum + (tx.amount < 0 ? Math.abs(tx.amount) : 0), 0);
    const budgetLimit = budgets.reduce((sum, b) => sum + b.amount, 0);

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
        console.error("AI Advice generation failed:", err);
      }
    }

    const html = buildWeeklySummaryHTML(
      totalSpent,
      budgetLimit > 0 ? budgetLimit : null,
      `${user.username}`,
      topCategories,
      aiAdvice
    );

    const result = await sendEmail({
      to: user.email,
      subject: 'Your FinanceNeo Weekly Summary',
      html,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test email sent to ${user.email}`,
        stats: {
          transactionsLast7Days: txs.length,
          totalSpent,
          budgetLimit: budgetLimit > 0 ? budgetLimit : null,
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Email sending failed — check server logs',
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[test-summary] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
