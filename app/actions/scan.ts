"use server"

import { createClient } from "@/utils/supabase/server"
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

const ALLOWED_CATEGORIES = [
    'Food & Dining', 'Groceries', 'Shopping', 'Transport', 'Fuel & Auto',
    'Travel', 'Health & Medical', 'Bills & Utilities', 'Entertainment',
    'Education', 'UPI Transfer', 'Income', 'Investment', 'Subscriptions',
    'Rent & Housing', 'Other'
];

// Shared schema for both PDF and image
const RESPONSE_SCHEMA = {
    type: SchemaType.ARRAY,
    items: {
        type: SchemaType.OBJECT,
        properties: {
            merchant: { type: SchemaType.STRING },
            amount:   { type: SchemaType.NUMBER },
            date:     { type: SchemaType.STRING },
            time:     { type: SchemaType.STRING },
            category: { type: SchemaType.STRING },
            type:     { type: SchemaType.STRING }
        },
        required: ["merchant", "amount", "date", "category", "type"]
    }
};

// Flash-Lite: 30 RPM free, fastest, perfect for extraction
function getModel() {
    return genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA as any
        }
    });
}

// Clean up pdf2json garbage before sending to Gemini
function cleanPDFText(raw: string): string {
    return raw
        .replace(/\r\n|\r/g, '\n')
        .replace(/[^\x20-\x7E\n₹]/g, ' ')  // strip non-printable chars
        .replace(/\s{3,}/g, '  ')           // collapse excessive whitespace
        .replace(/^\s*[\-=]{3,}\s*$/gm, '') // strip separator lines
        .trim();
}

// Process a single chunk — pure function, easy to parallelize
async function processChunk(chunk: string, chunkIndex: number): Promise<any[]> {
    const model = getModel();
    const prompt = `Extract ALL financial transactions from this bank statement text.
Rules:
- "- Rs." or "Dr" = Expense (debit), "+ Rs." or "Cr" = Income (credit)  
- Date format: YYYY-MM-DD. Time format: HH:mm:ss or null if missing.
- Categories: ${ALLOWED_CATEGORIES.join(", ")}
- Skip non-transaction lines (headers, footers, balance summaries)
- Return empty array [] if no transactions found in this chunk

TEXT:
${chunk}`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        console.error(`Chunk ${chunkIndex} failed:`, err);
        return []; // don't fail the whole batch
    }
}

export async function scanReceipt(base64Image: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("Unauthorized");
    if (!process.env.GOOGLE_GEMINI_API_KEY) throw new Error("Missing GOOGLE_GEMINI_API_KEY");

    // ── PDF Path ──────────────────────────────────────────────
    if (base64Image.startsWith('data:application/pdf;base64,')) {
        const base64Data = base64Image.replace('data:application/pdf;base64,', '');
        const buffer = Buffer.from(base64Data, 'base64');

        let extractedText = "";
        try {
            const PDFParser = require('pdf2json');
            const pdfParser = new PDFParser(null, 1);
            extractedText = await new Promise((resolve, reject) => {
                pdfParser.on("pdfParser_dataError", (e: any) => reject(new Error("Failed to parse PDF")));
                pdfParser.on("pdfParser_dataReady", () => resolve(pdfParser.getRawTextContent()));
                pdfParser.parseBuffer(buffer);
            });
        } catch (err) {
            return { success: false, error: "Failed to read PDF. Make sure it's a valid document." };
        }

        // Clean text BEFORE chunking — reduces token count significantly
        const cleanedText = cleanPDFText(extractedText as string);

        // Larger chunks = fewer API calls (Flash-Lite handles 1M tokens)
        const CHUNK_SIZE = 25000; // was 14000, safe to increase
        const chunks: string[] = [];
        for (let i = 0; i < cleanedText.length; i += CHUNK_SIZE) {
            chunks.push(cleanedText.substring(i, i + CHUNK_SIZE));
        }

        // Flash-Lite is 30 RPM — safe to run up to 25 chunks in parallel
        // For 100 pages, ~4 chunks of 25k chars = 4 parallel calls = ~3-5s total
        const PARALLEL_LIMIT = 25; // stay under 30 RPM
        const results: any[][] = [];

        for (let i = 0; i < chunks.length; i += PARALLEL_LIMIT) {
            const batch = chunks.slice(i, i + PARALLEL_LIMIT);
            const batchResults = await Promise.all(
                batch.map((chunk, idx) => processChunk(chunk, i + idx))
            );
            results.push(...batchResults);

            // Only throttle if there are MORE batches after this
            if (i + PARALLEL_LIMIT < chunks.length) {
                await new Promise(r => setTimeout(r, 1500)); // wait 1.5s between batches
            }
        }

        const allTransactions = results.flat();

        if (allTransactions.length === 0) {
            return { success: false, error: "No transactions found in this document." };
        }
        return { success: true, transactions: allTransactions };
    }

    // ── Image Path (unchanged logic, updated model) ───────────
    const mimeTypeMatch = base64Image.match(/^data:(image\/[^;]+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
    const base64Data = base64Image.replace(/^data:image\/[^;]+;base64,/, "");

    const prompt = `Extract receipt details into a JSON array.
Fields: merchant, amount (positive number), date (YYYY-MM-DD), time (HH:mm:ss or null), 
category (from: ${ALLOWED_CATEGORIES.join(", ")}), type ("Expense" or "Income").
Today's date if not found: ${new Date().toISOString().split('T')[0]}
Return empty array [] if image is not a receipt.`;

    try {
        const model = getModel();
        const result = await model.generateContent([
            { text: prompt },
            { inlineData: { mimeType, data: base64Data } }
        ]);

        let parsed = JSON.parse(result.response.text());
        if (!Array.isArray(parsed)) parsed = [parsed];
        if (parsed.length === 0) {
            return { success: false, error: "No transaction details found. Check the image is clear." };
        }

        const transactions = parsed.map((tx: any) => ({
            ...tx,
            date: `${tx.date || new Date().toISOString().split('T')[0]}T12:00:00.000Z`
        }));

        return { success: true, transactions };
    } catch (err: any) {
        return { success: false, error: "Failed to process the receipt image. Please try again." };
    }
}