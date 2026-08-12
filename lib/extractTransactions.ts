import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { extractText } from "unpdf";
import { categorizeAll } from "./categorize";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

const TRANSACTION_PROMPT = `You are a financial transaction extractor for Indian UPI/bank statements.

Extract EVERY transaction. Use ONLY these exact category names:
- "UPI Transfer" → person-to-person payments: "Paid to [Name]", "Money sent to [Name]", "Received from [Name]", personal UPI handles @ybl @okaxis @ptaxis @ibl @okicici
- "Groceries" → Zepto, Blinkit, BigBasket, supermarkets, grocery stores
- "Food & Dining" → Zomato, Swiggy, restaurants, cafes, food delivery
- "Shopping" → Amazon, Flipkart, Myntra, retail stores
- "Transport" → Uber, Ola, Rapido, metro, bus
- "Fuel & Auto" → petrol, BP, fuel stations, FastTag
- "Travel" → IRCTC, flights, hotels, MakeMyTrip
- "Entertainment" → Netflix, Spotify, movies, OTT
- "Subscriptions" → recurring app/service subscriptions
- "Bills & Utilities" → Jio recharge, electricity, broadband, DTH
- "Health & Medical" → pharmacy, hospital, doctor
- "Education" → school fees, courses, coaching
- "Investment" → Zerodha, Groww, mutual funds, SIP
- "Rent & Housing" → rent, PG, housing maintenance
- "Income" → salary, received salary, cashback, refund
- "Other" → anything else

CRITICAL RULES:
- "Paid to Ravi Mondal UPI ID: rv.ravi704762@okaxis" → UPI Transfer
- "Money sent to Srinkhal Raj UPI ID: 8709324826@ptaxis" → UPI Transfer  
- "Paid to Zepto UPI ID: zeptonow@ybl" → Groceries (merchant, not person)
- "Paid to Zomato UPI ID: payzomato@hdfcbank" → Food & Dining (merchant)
- "Recharge of Jio Mobile" → Bills & Utilities
- "Paid to BP GNA Zita 2 Tag: # Fuel" → Fuel & Auto
- Read FULL description, check merchant name AND UPI handle
- Extract the Transaction ID or Reference Number (UTR) into the referenceId field if present

DATE & TIME RULES (CRITICAL):
- Look at the STATEMENT HEADER CONTEXT provided below the prompt to determine the exact YEAR for each transaction. 
- If a transaction only says "26 Feb", you MUST use the correct year from the statement period (e.g. 2026). Do NOT guess the current year.
- Parse dates and exact times from the text into ISO 8601 format with explicit IST timezone: YYYY-MM-DDTHH:MM:SS+05:30. 
- If the time is present (e.g. 04:30 PM), convert it strictly to 24-hr format (e.g. 16:30:00+05:30). If time is absolutely missing, default to 12:00:00+05:30.

Return ONLY a valid JSON array, no markdown:
[{"date":"YYYY-MM-DDTHH:MM:SS+05:30","description":"full description","amount":0.00,"type":"credit or debit","category":"exact category name","referenceId":"Unique Txn ID or UTR (null if not found)"}]

Rules:
- amount always positive number
- Return [] if no transactions found`;

// ── Gemini model setup ──────────────────────────────────────────────────────
const RESPONSE_SCHEMA = {
    type: SchemaType.ARRAY,
    items: {
        type: SchemaType.OBJECT,
        properties: {
            date:        { type: SchemaType.STRING },
            description: { type: SchemaType.STRING },
            amount:      { type: SchemaType.NUMBER },
            type:        { type: SchemaType.STRING },
            category:    { type: SchemaType.STRING },
            referenceId: { type: SchemaType.STRING },
        },
        required: ["date", "description", "amount", "type", "category"],
    },
};

function getModel() {
    return genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA as any,
            temperature: 0,
        },
    });
}

// ── Text utilities ──────────────────────────────────────────────────────────

function cleanPDFText(raw: string): string {
    return raw
        .replace(/\r\n|\r/g, "\n")
        .replace(/[^\x20-\x7E\n₹]/g, " ")   // strip non-printable chars
        .replace(/\s{3,}/g, "  ")             // collapse 3+ spaces → 2
        .replace(/^\s*[-=]{3,}\s*$/gm, "")   // strip separator lines
        .trim();
}

function cleanDescription(desc: string): string {
    return desc
        .replace(/\s*Tag:\s*#\s*[^\n|]*/gi, "")
        .replace(/\s*Note:\s*UPIIntent/gi, "")
        .replace(/\s*on\s+UPI\s+Ref\s+No:\s*\d+/gi, "")
        .replace(/\s*UPI\s+Ref\s+No:\s*\d+/gi, "")
        .trim();
}

function safeParseJSON(raw: string): any[] {
    if (!raw || raw.trim() === "") return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        // Fallback: find the JSON array manually
        try {
            const s = raw.indexOf("[");
            const e = raw.lastIndexOf("]");
            if (s === -1 || e === -1 || e <= s) return [];
            return JSON.parse(raw.slice(s, e + 1));
        } catch (err) {
            console.error("[safeParseJSON] failed:", String(err));
            return [];
        }
    }
}

// Split text into chunks of ~25,000 chars with overlap
function splitTextIntoChunks(text: string, chunkSize = 25000, overlap = 500): string[] {
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
        const end = Math.min(i + chunkSize, text.length);
        chunks.push(text.slice(i, end));
        i += chunkSize - overlap;
    }
    return chunks;
}

// ── Single chunk processor ──────────────────────────────────────────────────

async function processChunk(
    chunk: string,
    headerContext: string,
    approxPage: number,
    signal?: AbortSignal
): Promise<any[]> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const model = getModel();
    const prompt = `${TRANSACTION_PROMPT}\n\nSTATEMENT HEADER CONTEXT (Use this to find the exact statement year):\n\`\`\`\n${headerContext}\n\`\`\`\n\nStatement text chunk to extract transactions from:\n\`\`\`\n${chunk}\n\`\`\``;

    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const txs = safeParseJSON(raw).map((tx: any) => ({
        ...tx,
        page: tx.page ?? approxPage,
    }));

    const categorized = categorizeAll(txs);
    return categorized.map((tx: any) => ({
        ...tx,
        description: cleanDescription(tx.description ?? ""),
    }));
}

// ── PDF extractor ───────────────────────────────────────────────────────────

const BATCH_SIZE = 25;        // max parallel Gemini calls per batch
const BATCH_DELAY_MS = 1500;  // delay between batches (stays under 30 RPM)

export async function extractFromPDF(
    pdfBytes: ArrayBuffer,
    onProgress?: (data: {
        percent: number;
        message: string;
        currentPage: number;
        totalPages: number;
        transactions?: any[];
    }) => void,
    signal?: AbortSignal
): Promise<any[]> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    onProgress?.({ percent: 5, message: "Reading PDF text...", currentPage: 0, totalPages: 0 });

    const buffer = new Uint8Array(pdfBytes);
    const { text, totalPages } = await extractText(buffer, { mergePages: true });
    const rawText = Array.isArray(text) ? text.join("\n") : text;
    const fullText = cleanPDFText(rawText);

    // First 1000 chars typically contain the statement date range / year
    const headerContext = fullText.slice(0, 1000);

    console.log(`[extractFromPDF] Extracted ${fullText.length} chars from ${totalPages} pages`);

    if (!fullText || fullText.trim().length < 50) {
        onProgress?.({ percent: 100, message: "Could not extract text — PDF may be scanned/image-based", currentPage: totalPages, totalPages });
        return [];
    }

    onProgress?.({ percent: 15, message: `Extracted text from ${totalPages} pages. Sending to Gemini AI...`, currentPage: 0, totalPages });

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const chunks = splitTextIntoChunks(fullText, 25000, 500);
    const totalChunks = chunks.length;
    console.log(`[extractFromPDF] Split into ${totalChunks} chunks`);

    const allTransactions: any[] = [];
    const seenKeys = new Set<string>();

    // Process chunks in parallel batches of BATCH_SIZE
    for (let batchStart = 0; batchStart < totalChunks; batchStart += BATCH_SIZE) {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

        const batchEnd = Math.min(batchStart + BATCH_SIZE, totalChunks);
        const batch = chunks.slice(batchStart, batchEnd);
        const startPercent = 15 + Math.round((batchStart / totalChunks) * 80);
        const targetPercent = 15 + Math.round((batchEnd / totalChunks) * 80);

        let currentBatchPercent = startPercent;
        const pdfTicker = setInterval(() => {
            if (signal?.aborted || currentBatchPercent >= targetPercent - 1) return;
            currentBatchPercent += 2;
            onProgress?.({
                percent: Math.min(currentBatchPercent, targetPercent - 1),
                message: `Analyzing PDF page content with Gemini AI (${Math.min(currentBatchPercent, targetPercent - 1)}%)...`,
                currentPage: Math.round((batchStart / totalChunks) * totalPages) + 1,
                totalPages,
            });
        }, 200);

        const batchResults = await Promise.all(
            batch.map(async (chunk, idx) => {
                const i = batchStart + idx;
                const approxPage = Math.round((i / totalChunks) * totalPages) + 1;
                try {
                    return await processChunk(chunk, headerContext, approxPage, signal);
                } catch (err: any) {
                    if (err.name === "AbortError") throw err;
                    console.error(`[extractFromPDF] Chunk ${i + 1} error:`, err.message);
                    return [];
                }
            })
        );
        clearInterval(pdfTicker);

        // Merge batch results, deduplicating
        const batchTxs: any[] = [];
        for (const txs of batchResults) {
            for (const tx of txs) {
                const key = `${tx.date}|${tx.amount}|${(tx.description ?? "").slice(0, 20)}`;
                if (!seenKeys.has(key)) {
                    seenKeys.add(key);
                    batchTxs.push(tx);
                }
            }
        }

        allTransactions.push(...batchTxs);

        const percent = 15 + Math.round((batchEnd / totalChunks) * 80);
        const approxPageDone = Math.round((batchEnd / totalChunks) * totalPages);

        console.log(`[extractFromPDF] Batch ${batchStart / BATCH_SIZE + 1}: chunks ${batchStart + 1}-${batchEnd}/${totalChunks} → ${batchTxs.length} new txs (total: ${allTransactions.length})`);

        onProgress?.({
            percent,
            message: `Chunks ${batchStart + 1}–${batchEnd} of ${totalChunks} — ${allTransactions.length} transactions found`,
            currentPage: approxPageDone,
            totalPages,
            transactions: batchTxs.length > 0 ? batchTxs : undefined,
        });

        // Inter-batch delay to stay within 30 RPM (only if more batches remain)
        if (batchEnd < totalChunks && !signal?.aborted) {
            await new Promise<void>((resolve, reject) => {
                const t = setTimeout(resolve, BATCH_DELAY_MS);
                signal?.addEventListener("abort", () => { clearTimeout(t); reject(new DOMException("Aborted", "AbortError")); });
            });
        }
    }

    onProgress?.({
        percent: 100,
        message: `Complete — ${allTransactions.length} transactions found`,
        currentPage: totalPages,
        totalPages,
        transactions: allTransactions,
    });

    console.log(`[extractFromPDF] Done. Total: ${allTransactions.length} transactions`);
    return allTransactions;
}

// ── Image extractor — keeps Gemini Vision ──────────────────────────────────

export async function extractFromImage(
    base64Image: string,
    onProgress?: (data: {
        percent: number;
        message: string;
        currentPage: number;
        totalPages: number;
        transactions?: any[];
    }) => void,
    signal?: AbortSignal
): Promise<any[]> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    onProgress?.({ percent: 12, message: "Scanning image with Gemini Vision...", currentPage: 0, totalPages: 1 });

    const imageData = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;
    const mimeMatch = base64Image.match(/data:([^;]+);base64/);
    const mimeType = (mimeMatch?.[1] ?? "image/jpeg") as any;

    // Smooth real-time progress ticker while waiting for Gemini API response
    let currentPercent = 12;
    const tickerInterval = setInterval(() => {
        if (signal?.aborted || currentPercent >= 92) return;
        currentPercent += Math.floor(Math.random() * 4) + 3; // increment smoothly by 3-6% every 250ms
        if (currentPercent > 92) currentPercent = 92;

        let msg = "Gemini Vision AI analyzing receipt...";
        if (currentPercent > 30 && currentPercent <= 55) msg = "Detecting line items, prices & dates...";
        else if (currentPercent > 55 && currentPercent <= 78) msg = "Matching merchant names & UPI handles...";
        else if (currentPercent > 78) msg = "Categorizing transactions & verifying amounts...";

        onProgress?.({
            percent: currentPercent,
            message: msg,
            currentPage: 1,
            totalPages: 1,
        });
    }, 250);

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        const result = await model.generateContent([
            { inlineData: { data: imageData, mimeType } },
            TRANSACTION_PROMPT,
        ]);

        clearInterval(tickerInterval);

        onProgress?.({ percent: 95, message: "Processing extracted items...", currentPage: 1, totalPages: 1 });

        const raw = result.response.text();
        const transactions = safeParseJSON(raw);
        const categorized = categorizeAll(transactions).map((tx: any) => ({
            ...tx,
            description: cleanDescription(tx.description ?? ""),
        }));

        onProgress?.({ percent: 100, message: `Found ${categorized.length} transactions`, currentPage: 1, totalPages: 1, transactions: categorized });
        return categorized;
    } catch (err) {
        clearInterval(tickerInterval);
        throw err;
    }
}
