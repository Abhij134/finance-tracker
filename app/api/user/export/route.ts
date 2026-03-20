import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import PDFDocument from "pdfkit";
import OpenAI from "openai";

const novita = new OpenAI({
    apiKey: process.env.NOVITA_API_KEY || 'MISSING_KEY',
    baseURL: 'https://api.novita.ai/v3/openai',
});

async function getExportInsights(transactions: any[]): Promise<string> {
    if (transactions.length === 0) return "No transactions found in this period.";

    // Quick summary
    const totalExpenses = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    const totalIncome = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);

    const prompt = `You are an expert financial analyst. Analyze these transactions and provide a simplified, highly accurate, and logical 3-4 sentence paragraph summarizing the user's spending. 
Break down the biggest expenses using accurate percentages (e.g. 40% on Dining). Keep it extremely professional and easy to understand. Do NOT use markdown bolding (**) or bullet points. Total Income: ₹${totalIncome}, Total Expenses: ₹${totalExpenses}, Transaction Count: ${transactions.length}.`;

    try {
        const response = await novita.chat.completions.create({
            model: 'qwen/qwen-2.5-72b-instruct',
            messages: [{ role: "user", content: prompt }],
            max_tokens: 300,
            temperature: 0.3,
        });
        return response.choices[0].message.content || "No insights generated.";
    } catch (e) {
        console.warn("AI generation failed for export:", e);
        return "AI analysis unavailable at this time.";
    }
}

export async function GET(req: Request) {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const url = new URL(req.url);
        const format = url.searchParams.get("format") || "csv";
        const fromParam = url.searchParams.get("from");
        const toParam = url.searchParams.get("to");
        const includeInsights = url.searchParams.get("insights") === "true";

        // 1. Validation & Rate Limiting (5 exports per hour)
        const ONE_HOUR_AGO = new Date(Date.now() - 60 * 60 * 1000);
        const recentExports = await (prisma as any).exportLog.count({
            where: {
                userId,
                createdAt: { gte: ONE_HOUR_AGO }
            }
        });

        if (recentExports >= 5) {
            return new NextResponse("Rate limit exceeded. Please try again later.", { status: 429 });
        }

        let dateFilter = {};
        let dateFrom = new Date(0); // arbitrary past
        let dateTo = new Date();

        if (fromParam && toParam) {
            dateFrom = new Date(fromParam);
            dateTo = new Date(toParam);

            // Validate max 2 years
            const diffYears = (dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24 * 365);
            if (diffYears > 2) {
                return new NextResponse("Date range cannot exceed 2 years", { status: 400 });
            }

            dateTo.setHours(23, 59, 59, 999);
            dateFilter = { date: { gte: dateFrom, lte: dateTo } };
        }

        // Fetch transactions
        const transactions = await prisma.transaction.findMany({
            where: { userId, ...dateFilter },
            orderBy: { date: 'desc' }
        });

        const totalExpenses = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
        const totalIncome = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);

        let aiText = "";
        if (includeInsights) {
            aiText = await getExportInsights(transactions);
        }

        // Log export
        await (prisma as any).exportLog.create({
            data: {
                userId,
                format,
                dateFrom,
                dateTo,
                insightsIncluded: includeInsights
            }
        });

        const dbUser = await prisma.user.findUnique({ where: { id: userId } });
        const userName = dbUser?.name || "User";

        // 2. CSV Generation
        if (format === "csv") {
            const csvRows = [];

            // Metadata header
            csvRows.push("FINANCE NEO - EXPORT REPORT");
            csvRows.push(`User: "${userName}"`);
            csvRows.push(`Range: ${fromParam ? dateFrom.toISOString().split('T')[0] : 'All Time'} to ${toParam ? dateTo.toISOString().split('T')[0] : 'Present'}`);
            csvRows.push(`Total Transactions: ${transactions.length}`);
            csvRows.push(`Total Income: ${totalIncome}`);
            csvRows.push(`Total Expenses: ${totalExpenses}`);

            if (includeInsights) {
                csvRows.push("");
                csvRows.push("--- AI INSIGHTS ---");
                csvRows.push(`"${aiText.replace(/"/g, '""')}"`);
                csvRows.push("-------------------");
            }

            csvRows.push("");
            csvRows.push(["Date", "Merchant", "Category", "Amount"].join(","));

            for (const t of transactions) {
                const date = new Date(t.date).toISOString().split('T')[0];
                const merchant = `"${t.merchant.replace(/"/g, '""')}"`;
                const category = `"${t.category.replace(/"/g, '""')}"`;
                const amount = t.amount.toString();
                csvRows.push([date, merchant, category, amount].join(","));
            }

            const csvString = csvRows.join("\n");

            return new NextResponse(csvString, {
                status: 200,
                headers: {
                    "Content-Type": "text/csv",
                    "Content-Disposition": 'attachment; filename="finance-neo-export.csv"',
                },
            });
        }

        // 3. PDF Generation
        else if (format === "pdf") {
            const pdfBuffer = await new Promise<Buffer>((resolve) => {
                const doc = new PDFDocument({ margin: 50, size: 'A4' });
                const chunks: Buffer[] = [];
                doc.on('data', chunk => chunks.push(Buffer.from(chunk)));
                doc.on('end', () => resolve(Buffer.concat(chunks)));

                // Colors
                const BRAND_COLOR = '#10b981';
                const TEXT_DARK = '#090c10';
                const TEXT_LIGHT = '#6b7280';
                const BORDER_COLOR = '#e5e7eb';
                const SHADE_COLOR = '#f9fafb';

                // --- HEADER ---
                doc.rect(0, 0, 595.28, 120).fill('#0e1118');
                doc.fillColor(BRAND_COLOR).fontSize(28).font('Helvetica-Bold').text('FinanceNeo', 50, 45);
                doc.fillColor('#ffffff').fontSize(14).font('Helvetica').text('Transaction Export', 50, 80);

                doc.fillColor('#a1a1aa').fontSize(10).font('Helvetica').text(`User: ${userName}`, 400, 45, { align: 'right' });
                doc.text(`Period: ${fromParam ? dateFrom.toISOString().split('T')[0] : 'All Time'} - ${toParam ? dateTo.toISOString().split('T')[0] : 'Present'}`, 350, 60, { align: 'right' });
                doc.text(`Generated: ${new Date().toISOString().split('T')[0]}`, 400, 75, { align: 'right' });

                // --- SUMMARY STATS ---
                let currentY = 150;
                doc.fillColor(TEXT_DARK).fontSize(16).font('Helvetica-Bold').text('Overview', 50, currentY);
                currentY += 25;

                doc.rect(50, currentY, 150, 60).fillAndStroke(SHADE_COLOR, BORDER_COLOR);
                doc.rect(220, currentY, 150, 60).fillAndStroke(SHADE_COLOR, BORDER_COLOR);
                doc.rect(390, currentY, 150, 60).fillAndStroke(SHADE_COLOR, BORDER_COLOR);

                doc.fillColor(TEXT_LIGHT).fontSize(10).font('Helvetica').text('TOTAL INCOME', 60, currentY + 10);
                doc.fillColor(BRAND_COLOR).fontSize(16).font('Helvetica-Bold').text(`Rs ${totalIncome.toLocaleString('en-IN')}`, 60, currentY + 30);

                doc.fillColor(TEXT_LIGHT).fontSize(10).font('Helvetica').text('TOTAL EXPENSES', 230, currentY + 10);
                doc.fillColor('#ef4444').fontSize(16).font('Helvetica-Bold').text(`Rs ${totalExpenses.toLocaleString('en-IN')}`, 230, currentY + 30);

                doc.fillColor(TEXT_LIGHT).fontSize(10).font('Helvetica').text('TRANSACTIONS', 400, currentY + 10);
                doc.fillColor(TEXT_DARK).fontSize(16).font('Helvetica-Bold').text(`${transactions.length}`, 400, currentY + 30);

                currentY += 80;

                // --- AI INSIGHTS ---
                if (includeInsights && aiText) {
                    currentY += 10;
                    doc.rect(50, currentY, 490, 80).fill('#ecfdf5');
                    doc.fillColor(BRAND_COLOR).fontSize(12).font('Helvetica-Bold').text('AI Financial Summary', 65, currentY + 15);
                    doc.fillColor('#065f46').fontSize(10).font('Helvetica').text(aiText, 65, currentY + 35, { width: 460, lineGap: 3 });
                    currentY += 100;
                } else {
                    currentY += 20;
                }

                // --- TABLE HEADER ---
                doc.fillColor(TEXT_DARK).fontSize(16).font('Helvetica-Bold').text('Transaction History', 50, currentY);
                currentY += 25;

                const colDate = 50;
                const colMerchant = 130;
                const colCategory = 370;
                const colAmount = 470;

                doc.rect(50, currentY, 490, 20).fill(BRAND_COLOR);
                doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
                doc.text('DATE', colDate + 5, currentY + 6);
                doc.text('MERCHANT', colMerchant + 5, currentY + 6);
                doc.text('CATEGORY', colCategory + 5, currentY + 6);
                doc.text('AMOUNT', colAmount + 5, currentY + 6, { width: 60, align: 'right' });

                currentY += 20;
                doc.fillColor(TEXT_DARK).font('Helvetica');

                // --- TABLE ROWS ---
                let isEven = false;
                for (const t of transactions) {
                    if (currentY > 750) {
                        doc.addPage();
                        currentY = 50;

                        doc.rect(50, currentY, 490, 20).fill(BRAND_COLOR);
                        doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
                        doc.text('DATE', colDate + 5, currentY + 6);
                        doc.text('MERCHANT', colMerchant + 5, currentY + 6);
                        doc.text('CATEGORY', colCategory + 5, currentY + 6);
                        doc.text('AMOUNT', colAmount + 5, currentY + 6, { width: 60, align: 'right' });
                        currentY += 20;
                        doc.fillColor(TEXT_DARK).font('Helvetica');
                    }

                    if (isEven) {
                        doc.rect(50, currentY, 490, 20).fill(SHADE_COLOR);
                    }
                    isEven = !isEven;

                    const dateStr = new Date(t.date).toISOString().split('T')[0];
                    const amountStr = (t.amount > 0 ? '+' : '') + `Rs ${Math.abs(t.amount).toLocaleString('en-IN')}`;
                    const amtColor = t.amount > 0 ? BRAND_COLOR : '#ef4444';

                    doc.fillColor(TEXT_LIGHT).text(dateStr, colDate + 5, currentY + 6);
                    doc.fillColor(TEXT_DARK).text(t.merchant.substring(0, 45), colMerchant + 5, currentY + 6, { width: 230 });
                    doc.fillColor(TEXT_LIGHT).text(t.category, colCategory + 5, currentY + 6);
                    doc.fillColor(amtColor).text(amountStr, colAmount + 5, currentY + 6, { width: 60, align: 'right' });

                    currentY += 20;
                }

                // Bottom line
                doc.moveTo(50, currentY).lineTo(540, currentY).stroke(BORDER_COLOR);

                doc.end();
            });

            return new NextResponse(pdfBuffer as any, {
                status: 200,
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": 'attachment; filename="finance-neo-export.pdf"',
                },
            });
        } else {
            return new NextResponse("Invalid format", { status: 400 });
        }

    } catch (error) {
        console.error("[EXPORT_ERROR]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
