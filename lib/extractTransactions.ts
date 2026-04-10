import Groq from "groq-sdk";
import { extractText } from "unpdf";
import { categorizeAll } from "./categorize";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

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

Return ONLY valid JSON array, no markdown:
[{"date":"YYYY-MM-DDTHH:MM:SS+05:30","description":"full description","amount":0.00,"type":"credit or debit","category":"exact category name","referenceId":"Unique Txn ID or UTR (null if not found)"}]

Rules:
- amount always positive number
- Return [] if no transactions found`;

function safeParseJSON(raw: string): any[] {
    if (!raw || raw.trim() === "") return [];
    try {
        const s = raw.indexOf("[");
        const e = raw.lastIndexOf("]");
        if (s === -1 || e === -1 || e <= s) return [];
        const parsed = JSON.parse(raw.slice(s, e + 1));
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        console.error("[safeParseJSON] failed:", String(err));
        console.error("[safeParseJSON] raw sample:", raw.slice(0, 300));
        return [];
    }
}

// Split text into chunks of ~3000 chars with overlap to avoid cutting transactions
function splitTextIntoChunks(text: string, chunkSize = 3000, overlap = 200): string[] {
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
        const end = Math.min(i + chunkSize, text.length);
        chunks.push(text.slice(i, end));
        i += chunkSize - overlap;
    }
    return chunks;
}

// Add this function near the top of extractTransactions.ts
function cleanDescription(desc: string): string {
    return desc
        .replace(/\s*Tag:\s*#\s*[^\n|]*/gi, "")      // remove Tag: # Food
        .replace(/\s*Note:\s*UPIIntent/gi, "")       // remove UPIIntent
        .replace(/\s*on\s+UPI\s+Ref\s+No:\s*\d+/gi, "") // remove UPI Ref No
        .replace(/\s*UPI\s+Ref\s+No:\s*\d+/gi, "")    // remove UPI Ref No variant
        .trim();
}
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

    onProgress?.({
        percent: 5,
        message: "Reading PDF text...",
        currentPage: 0,
        totalPages: 0,
    });

    // Extract all text from PDF natively using unpdf
    const buffer = new Uint8Array(pdfBytes);
    const { text, totalPages } = await extractText(buffer, { mergePages: true });
    const fullText = Array.isArray(text) ? text.join("\n") : text;

    // Grab the first 1000 characters which usually contains the statement year/date range
    const headerContext = fullText.slice(0, 1000);

    console.log(`[extractFromPDF] Extracted ${fullText.length} chars from ${totalPages} pages`);
    console.log(`[extractFromPDF] Text sample: ${fullText.slice(0, 300)}`);

    if (!fullText || fullText.trim().length < 50) {
        onProgress?.({
            percent: 100,
            message: "Could not extract text — PDF may be scanned/image-based",
            currentPage: totalPages,
            totalPages,
        });
        return [];
    }

    onProgress?.({
        percent: 15,
        message: `Extracted text from ${totalPages} pages. Sending to AI...`,
        currentPage: 0,
        totalPages,
    });

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    // Split into chunks and process
    const chunks = splitTextIntoChunks(fullText, 2500, 150);
    const totalChunks = chunks.length;

    console.log(`[extractFromPDF] Split into ${totalChunks} text chunks`);

    const allTransactions: any[] = [];
    const seenKeys = new Set<string>(); // dedup by date+amount+description

    for (let i = 0; i < chunks.length; i++) {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

        const chunk = chunks[i];
        const approxPage = Math.round((i / totalChunks) * totalPages) + 1;

        try {
            const response = await groq.chat.completions.create(
                {
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        {
                            role: "system",
                            content: "You are a financial transaction extractor. Return only valid JSON arrays.",
                        },
                        {
                            role: "user",
                            content: `${TRANSACTION_PROMPT}\n\nSTATEMENT HEADER CONTEXT (Use this to find the exact statement year for transactions that lack a year):\n\`\`\`\n${headerContext}\n\`\`\`\n\nStatement chunk text to extract transactions from:\n\`\`\`\n${chunk}\n\`\`\``,
                        },
                    ],
                    temperature: 0,
                    max_tokens: 2048,
                },
                { signal }
            );

            const raw = response.choices?.[0]?.message?.content ?? "[]";
            const txs = safeParseJSON(raw).map((tx: any) => ({
                ...tx,
                page: tx.page ?? approxPage,
            }));

            // Categorize with FULL description first (Tag: # hints are useful)
            const categorizedTxs = categorizeAll(txs);

            // Then clean description for display
            const cleanedTxs = categorizedTxs.map((tx: any) => ({
                ...tx,
                description: cleanDescription(tx.description ?? ""),
            }));

            // Deduplicate
            const newTxs = cleanedTxs.filter((tx: any) => {
                const key = `${tx.date}|${tx.amount}|${tx.description?.slice(0, 20)}`;
                if (seenKeys.has(key)) return false;
                seenKeys.add(key);
                return true;
            });

            allTransactions.push(...newTxs);

            const percent = 15 + Math.round(((i + 1) / totalChunks) * 80);
            const approxPageDone = Math.round(((i + 1) / totalChunks) * totalPages);

            console.log(`[extractFromPDF] Chunk ${i + 1}/${totalChunks}: found ${newTxs.length} transactions (total: ${allTransactions.length})`);

            onProgress?.({
                percent,
                message: `Chunk ${i + 1} of ${totalChunks} — ${allTransactions.length} transactions found`,
                currentPage: approxPageDone,
                totalPages,
                transactions: newTxs.length > 0 ? newTxs : undefined,
            });

        } catch (err: any) {
            if (err.name === "AbortError") throw err;
            console.error(`[extractFromPDF] Chunk ${i + 1} error:`, err.message);
            onProgress?.({
                percent: 15 + Math.round(((i + 1) / totalChunks) * 80),
                message: `Chunk ${i + 1} failed, continuing...`,
                currentPage: Math.round(((i + 1) / totalChunks) * totalPages),
                totalPages,
            });
        }

        // Rate limit delay — llama-3.3-70b has generous limits but be safe
        if (i < chunks.length - 1 && !signal?.aborted) {
            await new Promise<void>((resolve, reject) => {
                const t = setTimeout(resolve, 300);
                signal?.addEventListener("abort", () => {
                    clearTimeout(t);
                    reject(new DOMException("Aborted", "AbortError"));
                });
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

    onProgress?.({
        percent: 20,
        message: "Scanning image with Groq Vision...",
        currentPage: 0,
        totalPages: 1,
    });

    const imageData = base64Image.includes(",")
        ? base64Image.split(",")[1]
        : base64Image;

    const mimeMatch = base64Image.match(/data:([^;]+);base64/);
    const mimeType = mimeMatch?.[1] ?? "image/jpeg";

    const response = await groq.chat.completions.create(
        {
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [{
                role: "user",
                content: [
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:${mimeType};base64,${imageData}`,
                            detail: "high",
                        },
                    },
                    { type: "text", text: TRANSACTION_PROMPT },
                ],
            }],
            temperature: 0,
            max_tokens: 4096,
        },
        { signal }
    );

    onProgress?.({
        percent: 85,
        message: "Processing results...",
        currentPage: 1,
        totalPages: 1,
    });

    const raw = response.choices?.[0]?.message?.content ?? "[]";
    const transactions = safeParseJSON(raw as string);
    const categorized = categorizeAll(transactions);

    onProgress?.({
        percent: 100,
        message: `Found ${categorized.length} transactions`,
        currentPage: 1,
        totalPages: 1,
        transactions: categorized,
    });

    return categorized;
}
