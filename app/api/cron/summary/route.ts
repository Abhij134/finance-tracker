import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail, buildWeeklySummaryHTML } from '@/lib/email';

// Ensure the route is evaluated dynamically
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    // 1. Secure the cron endpoint
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        // 2. Fetch users who want the weekly summary
        const users = await prisma.user.findMany({
            where: {
                periodicSummaryEmailEnabled: true,
                email: { not: '' }
            },
            select: {
                id: true,
                email: true,
                name: true,
                budgets: true,
            }
        });

        if (users.length === 0) {
            return NextResponse.json({ success: true, message: 'No users to email.' });
        }

        // Identify the date range: Last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // 3. Process each user and send emails concurrently using Promise.allSettled
        const results = await Promise.allSettled(
            users.map(async (user) => {
                // Find total expenses for this user in the last 7 days
                const txs = await prisma.transaction.findMany({
                    where: {
                        userId: user.id,
                        date: { gte: sevenDaysAgo }
                    },
                    select: { amount: true }
                });

                const totalSpent = txs.reduce((sum, tx) => sum + tx.amount, 0);

                // Sum up total budget limits (or you could adapt this to be overall budget)
                const budgetLimit = user.budgets.reduce((sum, b) => sum + b.amount, 0);

                // Build HTML
                const html = buildWeeklySummaryHTML(
                    totalSpent,
                    budgetLimit > 0 ? budgetLimit : null,
                    user.name || "FinanceNeo User"
                );

                // Send Email
                await sendEmail({
                    to: user.email,
                    subject: 'Your FinanceNeo Weekly Summary',
                    html
                });

                return { userId: user.id, status: 'sent' };
            })
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        return NextResponse.json({
            success: true,
            message: `Weekly summaries sent to ${successful}/${users.length} users.`,
        });

    } catch (error: any) {
        console.error('Weekly summary cron error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
