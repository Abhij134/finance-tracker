"use server"
import prisma from "@/lib/prisma"

export async function createTransaction(userId: string, formData: any) {
    const newTx = await prisma.transaction.create({
        data: {
            userId: userId,
            merchant: formData.merchant,
            amount: formData.amount,
            category: formData.category,
            isAiScanned: formData.isAiScanned || false,
        }
    });
    return newTx;
}

export async function getUserTransactions(userId: string) {
    const transactions = await prisma.transaction.findMany({
        where: {
            userId: userId,
        },
        orderBy: {
            date: 'desc',
        },
        take: 10,
    });
    return transactions;
}

export async function deleteTransaction(transactionId: string) {
    await prisma.transaction.delete({
        where: {
            id: transactionId,
        }
    });
}