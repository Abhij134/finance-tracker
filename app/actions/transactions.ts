"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import prisma from '@/lib/prisma';

export async function addTransaction(formData: any) {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    try {
        const data = await prisma.transaction.create({
            data: {
                userId,
                merchant: formData.merchant,
                amount: parseFloat(formData.amount),
                category: formData.category,
                isAiScanned: formData.method === "ai" || formData.isAiScanned || false,
                date: formData.date ? new Date(formData.date) : new Date(),
            }
        });

        // Trigger alerts asynchronously
        (prisma.user as any).findUnique({
            where: { id: userId },
            select: {
                email: true,
                lastUnusualSpendAlert: true,
                largeTxEmailEnabled: true,
                largeTxThreshold: true,
                unusualSpendingEmailEnabled: true,
                unusualSpendingThreshold: true,
                budgets: true,
            }
        }).then(async (userPrefs: any) => {
            if (!userPrefs?.email) return;

            const isExpense = data.amount < 0;
            const absAmount = Math.abs(data.amount);

            // 1. Large Transaction Check (ONLY FOR EXPENSES)
            if (userPrefs.largeTxEmailEnabled && isExpense && absAmount >= userPrefs.largeTxThreshold) {
                const { sendEmail, buildLargeTransactionHTML } = await import('@/lib/email');
                const html = buildLargeTransactionHTML(absAmount, data.merchant, data.date);
                await sendEmail({
                    to: userPrefs.email,
                    subject: `Large Transaction Alert: ₹${absAmount} at ${data.merchant}`,
                    html
                });
            }

            // 2. Unusual Spending Prediction
            if (userPrefs.unusualSpendingEmailEnabled && isExpense && userPrefs.budgets && userPrefs.budgets.length > 0) {
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                const currentDayNumber = now.getDate();

                if (currentDayNumber >= 3) {
                    const monthTxs = await prisma.transaction.findMany({
                        where: {
                            userId: userId,
                            date: { gte: startOfMonth, lte: now },
                            amount: { lt: 0 } // ONLY sum expenses
                        },
                        select: { amount: true }
                    });

                    const totalSpentSoFar = monthTxs.reduce((sum: number, tx: any) => sum + Math.abs(tx.amount), 0);
                    const dailyAverage = totalSpentSoFar / currentDayNumber;
                    const predictedMonthlyTotal = dailyAverage * daysInMonth;
                    const totalBudgetLimit = userPrefs.budgets.reduce((sum: number, b: any) => sum + b.amount, 0);

                    if (totalBudgetLimit > 0) {
                        const thresholdRatio = userPrefs.unusualSpendingThreshold / 100;
                        const alertThresholdAmount = totalBudgetLimit * thresholdRatio;

                        if (predictedMonthlyTotal > alertThresholdAmount) {
                            // 3. Throttling/Cooldown Check
                            const lastAlert = userPrefs.lastUnusualSpendAlert;
                            const cooldownPassed = !lastAlert || (Date.now() - new Date(lastAlert).getTime() > 7 * 24 * 60 * 60 * 1000);

                            if (cooldownPassed) {
                                let behavior = "steady";
                                if (absAmount > (dailyAverage * 2)) behavior = "a recent spike in";
                                const msg = `Based on your daily average spending of ₹${Math.round(dailyAverage)}, compounded by ${behavior} spending, you are tracking to spend roughly ₹${Math.round(predictedMonthlyTotal)} by the end of the month.`;

                                const { sendEmail, buildUnusualSpendingHTML } = await import('@/lib/email');
                                const html = buildUnusualSpendingHTML(predictedMonthlyTotal, totalBudgetLimit, userPrefs.unusualSpendingThreshold, msg);
                                await sendEmail({
                                    to: userPrefs.email,
                                    subject: '⚠️ AI Alert: Unusual Spending Pattern Detected',
                                    html
                                });

                                // Update cooldown timestamp
                                await (prisma.user as any).update({
                                    where: { id: userId },
                                    data: { lastUnusualSpendAlert: new Date() }
                                });
                            }
                        }
                    }
                }
            }
        }).catch((err: any) => console.error("Error triggering alerts:", err));

        revalidatePath("/");
        return data;
    } catch (e: any) {
        throw new Error(e.message || "Failed to add transaction");
    }
}

export async function updateTransaction(id: string, data: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    if (!userId) throw new Error("Unauthorized");

    try {
        const existing = await prisma.transaction.findUnique({ where: { id } });
        if (!existing || existing.userId !== userId) throw new Error("Unauthorized");

        const updated = await prisma.transaction.update({
            where: { id },
            data: {
                merchant: data.merchant,
                amount: parseFloat(data.amount),
                category: data.category,
                isAiScanned: data.method === "ai" || data.isAiScanned || false,
                date: new Date(data.date),
            },
            select: {
                id: true,
                date: true,
                merchant: true,
                amount: true,
                category: true,
                isAiScanned: true,
            }
        });
        revalidatePath("/");
        revalidatePath("/transactions");
        return updated;
    } catch (e: any) {
        throw new Error(e.message || "Failed to update transaction");
    }
}

export async function addBulkTransactions(transactions: any[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    if (!userId) throw new Error("Unauthorized");

    try {
        const rows = transactions.map(tx => ({
            userId,
            merchant: tx.merchant,
            amount: parseFloat(tx.amount),
            category: tx.category,
            isAiScanned: tx.method === "ai" || tx.isAiScanned || false,
            date: tx.date ? new Date(tx.date) : new Date(),
            referenceId: tx.referenceId || null,
        }));

        const minDate = new Date(Math.min(...rows.map(r => r.date.getTime())));
        const maxDate = new Date(Math.max(...rows.map(r => r.date.getTime())));

        const existingTxs = await prisma.transaction.findMany({
            where: {
                userId,
                date: {
                    gte: new Date(minDate.setHours(0, 0, 0, 0)),
                    lte: new Date(maxDate.setHours(23, 59, 59, 999))
                }
            },
            select: { date: true, merchant: true, amount: true, referenceId: true }
        });

        const uniqueRows = rows.filter(newTx => {
            // First deduplicate by explicitly provided transaction ID
            if (newTx.referenceId) {
                const matchIndex = existingTxs.findIndex(ex => ex.referenceId === newTx.referenceId);
                if (matchIndex !== -1) {
                    existingTxs.splice(matchIndex, 1);
                    return false;
                }
            }

            // Fallback to heuristic date/merchant/amount matching
            const dateStr = newTx.date.toISOString().split('T')[0];
            const matchIndex = existingTxs.findIndex(ex =>
                ex.merchant === newTx.merchant &&
                Math.abs(ex.amount - newTx.amount) < 0.01 &&
                ex.date.toISOString().split('T')[0] === dateStr
            );

            if (matchIndex !== -1) {
                existingTxs.splice(matchIndex, 1);
                return false; // Found a duplicate in the database, skip inserting
            }
            return true;
        });

        if (uniqueRows.length === 0) {
            return { success: true, addedCount: 0 };
        }

        const result = await prisma.transaction.createMany({
            data: uniqueRows
        });

        revalidatePath("/");
        revalidatePath("/transactions");

        // Trigger alerts asynchronously for bulk imports
        (prisma.user as any).findUnique({
            where: { id: userId },
            select: {
                email: true,
                lastUnusualSpendAlert: true,
                largeTxEmailEnabled: true,
                largeTxThreshold: true,
                unusualSpendingEmailEnabled: true,
                unusualSpendingThreshold: true,
                budgets: true,
            }
        }).then(async (userPrefs: any) => {
            if (!userPrefs?.email) return;

            const hasExpenses = uniqueRows.some(tx => tx.amount < 0);

            // 1. Large Transaction Alerts
            if (userPrefs.largeTxEmailEnabled) {
                const { sendEmail, buildLargeTransactionHTML } = await import('@/lib/email');
                const largeTxs = uniqueRows.filter(tx => tx.amount < 0 && Math.abs(tx.amount) >= userPrefs.largeTxThreshold);

                for (const tx of largeTxs) {
                    const html = buildLargeTransactionHTML(tx.amount, tx.merchant, tx.date);
                    await sendEmail({
                        to: userPrefs.email,
                        subject: `Large Transaction Alert: ₹${Math.abs(tx.amount)} at ${tx.merchant}`,
                        html
                    });
                }
            }

            // 2. Unusual Spending Alert (Bulk evaluates the final sum)
            if (userPrefs.unusualSpendingEmailEnabled && hasExpenses && userPrefs.budgets && userPrefs.budgets.length > 0) {
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                const currentDayNumber = now.getDate();

                if (currentDayNumber >= 3) {
                    const monthTxs = await prisma.transaction.findMany({
                        where: { userId: userId, date: { gte: startOfMonth, lte: now }, amount: { lt: 0 } },
                        select: { amount: true }
                    });

                    const totalSpentSoFar = monthTxs.reduce((sum: number, tx: any) => sum + Math.abs(tx.amount), 0);
                    const predictedMonthlyTotal = (totalSpentSoFar / currentDayNumber) * daysInMonth;
                    const totalBudgetLimit = userPrefs.budgets.reduce((sum: number, b: any) => sum + b.amount, 0);

                    if (totalBudgetLimit > 0) {
                        const thresholdRatio = userPrefs.unusualSpendingThreshold / 100;
                        if (predictedMonthlyTotal > (totalBudgetLimit * thresholdRatio)) {
                            // 3. Throttling/Cooldown Check
                            const lastAlert = userPrefs.lastUnusualSpendAlert;
                            const cooldownPassed = !lastAlert || (Date.now() - new Date(lastAlert).getTime() > 7 * 24 * 60 * 60 * 1000);

                            if (cooldownPassed) {
                                const msg = `Your recent bulk transaction import has significantly altered your spending trajectory. You are now tracking to spend roughly ₹${Math.round(predictedMonthlyTotal)} by the end of the month.`;
                                const { sendEmail, buildUnusualSpendingHTML } = await import('@/lib/email');
                                const html = buildUnusualSpendingHTML(predictedMonthlyTotal, totalBudgetLimit, userPrefs.unusualSpendingThreshold, msg);
                                await sendEmail({
                                    to: userPrefs.email,
                                    subject: '⚠️ AI Alert: Unusual Spending Pattern Detected',
                                    html
                                });

                                // Update cooldown timestamp
                                await (prisma.user as any).update({
                                    where: { id: userId },
                                    data: { lastUnusualSpendAlert: new Date() }
                                });
                            }
                        }
                    }
                }
            }

        }).catch((err: any) => console.error("Error triggering bulk alerts:", err));

        revalidatePath("/");
        revalidatePath("/transactions");
        return { success: true, addedCount: result.count };
    } catch (e: any) {
        throw new Error(e.message || "Failed to add bulk transactions");
    }
}

export async function getTransactions(options: { limit?: number; offset?: number; startDate?: Date } = {}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    if (!userId) return [];

    const { limit = 2000, offset = 0, startDate } = options;

    try {
        const transactions = await prisma.transaction.findMany({
            where: {
                userId: userId,
                ...(startDate ? { date: { gte: startDate } } : {})
            },
            orderBy: { date: 'desc' },
            take: limit,
            skip: offset,
            select: {
                id: true,
                date: true,
                merchant: true,
                amount: true,
                category: true,
                isAiScanned: true,
            }
        });

        return transactions;
    } catch (e) {
        console.error('getTransactions failed:', e);
        throw e; // Throw so that error boundaries or callers can handle it properly
    }
}

export async function deleteTransaction(transactionId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    if (!userId) throw new Error("Unauthorized");

    try {
        const existing = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (!existing || existing.userId !== userId) throw new Error("Unauthorized");

        await prisma.transaction.delete({ where: { id: transactionId } });
        revalidatePath("/");
        revalidatePath("/transactions");
    } catch (e: any) {
        throw new Error(e.message || "Failed to delete transaction");
    }
}

export async function deleteBulkTransactions(transactionIds: string[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    if (!userId) throw new Error("Unauthorized");

    try {
        await prisma.transaction.deleteMany({
            where: {
                id: { in: transactionIds },
                userId: userId
            }
        });
        revalidatePath("/");
    } catch (e: any) {
        throw new Error(e.message || "Failed to delete bulk transactions");
    }
}

export async function updateBulkTransactionsCategory(transactionIds: string[], newCategory: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    if (!userId) throw new Error("Unauthorized");

    try {
        await prisma.transaction.updateMany({
            where: {
                id: { in: transactionIds },
                userId: userId
            },
            data: { category: newCategory }
        });
        revalidatePath("/");
    } catch (e: any) {
        throw new Error(e.message || "Failed to update categories");
    }
}

export async function updateBulkTransactionsDate(transactionIds: string[], newDate: string) {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    const { error } = await supabase.from('Transaction')
        .update({ date: new Date(newDate).toISOString() })
        .in('id', transactionIds)
        .eq('userId', userId);

    if (error) throw new Error(error.message);
    revalidatePath("/");
    revalidatePath("/transactions");
}
