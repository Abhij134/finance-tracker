"use server"

import { createClient } from "@/utils/supabase/server"
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai"

// Initialize Gemini SDK
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

const ALLOWED_CATEGORIES = [
    'Food & Dining', 'Groceries', 'Shopping', 'Transport', 'Fuel & Auto',
    'Travel', 'Health & Medical', 'Bills & Utilities', 'Entertainment',
    'Education', 'UPI Transfer', 'Income', 'Investment', 'Subscriptions',
    'Rent & Housing', 'Other'
];

export async function scanReceipt(base64Image: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    if (!userId) {
        throw new Error("Unauthorized");
    }

    if (!process.env.GOOGLE_GEMINI_API_KEY) {
        throw new Error("Missing GOOGLE_GEMINI_API_KEY in environment");
    }

    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        merchant: { type: SchemaType.STRING },
                        amount: { type: SchemaType.NUMBER },
                        date: { type: SchemaType.STRING },
                        time: { type: SchemaType.STRING },
                        category: { type: SchemaType.STRING },
                        type: { type: SchemaType.STRING }
                    },
                    required: ["merchant", "amount", "date", "category", "type"]
                }
            }
        }
    });

    if (base64Image.startsWith('data:application/pdf;base64,')) {
        const base64Data = base64Image.replace('data:application/pdf;base64,', '');
        const buffer = Buffer.from(base64Data, 'base64');

        let extractedText = "";
        try {
            const PDFParser = require('pdf2json');
            const pdfParser = new PDFParser(null, 1);

            extractedText = await new Promise((resolve, reject) => {
                pdfParser.on("pdfParser_dataError", (errData: any) => reject(new Error("Failed to parse PDF document.")));
                pdfParser.on("pdfParser_dataReady", () => resolve(pdfParser.getRawTextContent()));
                pdfParser.parseBuffer(buffer);
            });
        } catch (err) {
            console.error("PDF Parsing Error:", err);
            return { success: false, error: "Failed to read PDF. Make sure it's a valid document." };
        }

        const chunkSize = 14000;
        const textChunks = [];
        for (let i = 0; i < extractedText.length; i += chunkSize) {
            textChunks.push(extractedText.substring(i, i + chunkSize));
        }

        let allParsedTransactions: any[] = [];

        for (let i = 0; i < textChunks.length; i++) {
            const chunk = textChunks[i];
            const prompt = `
                Extract transactions from this bank statement text.
                Categories to use: ${ALLOWED_CATEGORIES.join(", ")}.
                Note: "- Rs." is Expense, "+ Rs." is Income. 
                Categorize intelligently.
                Format the Date as YYYY-MM-DD and Time as HH:mm:ss (if available, else null).
                TEXT:
                ${chunk}
            `;

            try {
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();
                const parsed = JSON.parse(text);
                if (Array.isArray(parsed)) {
                    allParsedTransactions.push(...parsed);
                }
            } catch (err) {
                console.error(`Error processing chunk ${i + 1}:`, err);
            }

            if (i < textChunks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limiting
            }
        }

        if (allParsedTransactions.length === 0) {
            return { success: false, error: "No transactions could be extracted from this document." };
        }
        return { success: true, transactions: allParsedTransactions };
    } else {
        const mimeTypeMatch = base64Image.match(/^data:(image\/[^;]+);base64,/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
        const base64Data = base64Image.replace(/^data:image\/[^;]+;base64,/, "");

        const prompt = `
            Extract receipt details into a JSON array of objects. 
            Even if there is only one receipt, return an array with one object.
            
            Fields:
            - merchant: Store/Merchant name
            - amount: Total amount (positive number)
            - date: Transaction date (YYYY-MM-DD). If not found, use today's date: ${new Date().toISOString().split('T')[0]}
            - time: Transaction time (HH:mm:ss). If not found, return null.
            - category: Best fit from: ${ALLOWED_CATEGORIES.join(", ")}
            - type: Always "Expense" for receipts unless it's clearly an income document.
            
            If the image is too blurry to read or doesn't look like a receipt/invoice, return an empty array.
        `;

        try {
            const result = await model.generateContent([
                { text: prompt },
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Data
                    }
                }
            ]);

            const response = await result.response;
            const text = response.text();
            let parsedTransactions = JSON.parse(text);

            if (!Array.isArray(parsedTransactions)) {
                parsedTransactions = [parsedTransactions];
            }

            if (parsedTransactions.length === 0) {
                return { success: false, error: "We couldn't find any clear transaction details. Please ensure the image is well-lit and not blurry." };
            }

            const transactionsWithFullDate = parsedTransactions.map((tx: any) => {
                const dateOnly = tx.date || new Date().toISOString().split("T")[0];
                // Normalize to 12:00 PM UTC to avoid timezone bleed
                const normalizedDate = `${dateOnly}T12:00:00.000Z`;
                return {
                    ...tx,
                    date: normalizedDate
                };
            });

            return { success: true, transactions: transactionsWithFullDate };
        } catch (err: any) {
            console.error("Failed to scan receipt with Gemini SDK:", err);
            if (err.message?.includes("blurry") || err.message?.includes("Safety")) {
                return { success: false, error: "The AI was unable to process this image safely or it might be too blurry." };
            }
            return { success: false, error: "Failed to process the receipt image. Please try again." };
        }
    }
}

