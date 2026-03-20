import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/prisma';

// NOTE: Node.js runtime — NOT edge. Required for sequential processing + Supabase.

// ─── PROVIDER TOGGLE ───────────────────────────────────────────────────────────
const ACTIVE_PROVIDER: 'gemini' | 'groq' = 'gemini';
const MODEL = ACTIVE_PROVIDER === 'gemini' ? 'gemini-2.5-flash' : 'llama-3.1-8b-instant';

const aiClient = new OpenAI({
    baseURL: ACTIVE_PROVIDER === 'gemini'
        ? 'https://generativelanguage.googleapis.com/v1beta/openai/'
        : 'https://api.groq.com/openai/v1',
    apiKey: ACTIVE_PROVIDER === 'gemini'
        ? process.env.GOOGLE_GEMINI_API_KEY
        : process.env.GROQ_API_KEY,
    maxRetries: 0,
});

const CHUNK_SIZE = 5000;
const INTER_CHUNK_DELAY_MS = 25000;

function sleep(ms: number) {
    return new Promise(r => setTimeout(r, ms));
}

const VALID_CATEGORIES = new Set([
    'Food & Dining', 'Groceries', 'Shopping', 'Transport', 'Fuel & Auto',
    'Travel', 'Health & Medical', 'Bills & Utilities', 'Entertainment',
    'Education', 'UPI Transfer', 'Income', 'Investment', 'Subscriptions',
    'Rent & Housing', 'Other'
]);

// ─── AI EXTRACTION ─────────────────────────────────────────────────────────────
async function extractTransactionsFromChunk(text: string): Promise<any[]> {
    const systemPrompt = `Extract all financial transactions from the following bank statement text. 
    CRITICAL RULES FOR 'type':
    1. If the money left the account (Debit / Withdrawal / Payment / Spent), the type MUST be 'EXPENSE'. 
    2. If the money entered the account (Credit / Deposit / Received), the type MUST be 'INCOME'.
    3. The amount should always be a positive absolute number. The type field will dictate the flow.`;

    try {
        if (ACTIVE_PROVIDER === 'gemini') {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        role: 'user',
                        parts: [{ text: `System Instructions: ${systemPrompt}\n\nUser Content to process: ${text}` }]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        response_mime_type: "application/json",
                        response_schema: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    date: { type: "STRING" },
                                    merchant: { type: "STRING" },
                                    amount: { type: "NUMBER" },
                                    category: { type: "STRING" },
                                    type: { type: "STRING", enum: ["INCOME", "EXPENSE"] }
                                },
                                required: ["date", "merchant", "amount", "category", "type"]
                            }
                        }
                    }
                })
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Gemini API Error: ${response.status} ${response.statusText} - ${errorBody}`);
            }

            const data = await response.json();
            const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
            // With structured outputs, rawContent is guaranteed to be valid JSON
            const parsed = JSON.parse(rawContent);
            return Array.isArray(parsed) ? parsed : (parsed.transactions || []);
        } else {
            // Groq still uses OpenAI SDK
            const response = await aiClient.chat.completions.create({
                model: MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: text },
                ],
                temperature: 0.1,
            });

            const rawContent = response.choices[0]?.message?.content || '[]';
            const cleanContent = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleanContent);
            return Array.isArray(parsed) ? parsed : (parsed.transactions || []);
        }
    } catch (err: any) {
        console.error(`[scan] AI API Error (Provider: ${ACTIVE_PROVIDER}, Model: ${MODEL}):`, {
            status: err.status,
            message: err.message,
            detail: err.message,
        });
        throw err;
    }
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const textToProcess = body.fullText || body.textChunk || body.text;

        if (!textToProcess) {
            return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 });
        }

        const apiKey = ACTIVE_PROVIDER === 'gemini' ? process.env.GOOGLE_GEMINI_API_KEY : process.env.GROQ_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: `Missing ${ACTIVE_PROVIDER.toUpperCase()}_API_KEY` }, { status: 500 });
        }

        // ─── CHUNKING ─────────────────────────────────────────────────────────────
        const chunks: string[] = [];
        for (let i = 0; i < textToProcess.length; i += CHUNK_SIZE) {
            chunks.push(textToProcess.substring(i, i + CHUNK_SIZE));
        }

        console.log(`[scan] ${ACTIVE_PROVIDER.toUpperCase()} | model=${MODEL} | ${chunks.length} chunk(s)`);

        const rawExtracted: any[] = [];

        for (let i = 0; i < chunks.length; i++) {
            console.log(`[scan] Chunk ${i + 1}/${chunks.length}...`);
            try {
                const txs = await extractTransactionsFromChunk(chunks[i]);
                rawExtracted.push(...txs);
            } catch (err: any) {
                console.error(`[scan] FATAL: Chunk ${i + 1} processing failed. Current total items: ${rawExtracted.length}. Error detail above.`);
            }

            if (i < chunks.length - 1) {
                await sleep(INTER_CHUNK_DELAY_MS);
            }
        }

        if (rawExtracted.length === 0) {
            return NextResponse.json({ success: true, transactions: [], count: 0, message: 'No transactions found in this document.' });
        }

        // ─── DUAL-LAYER DEDUPLICATION ─────────────────────────────────────────────
        // Fetch ALL existing transactions for this user (including referenceId)
        const { data: existing } = await supabase
            .from('Transaction')
            .select('date, amount, merchant, referenceId')
            .eq('userId', userId);

        // Normalize existing data into two lookup structures
        // Layer 1: Set of known referenceIds (non-null only)
        const existingRefIds = new Set(
            (existing || [])
                .map((t: any) => t.referenceId)
                .filter(Boolean) // Drop nulls
        );

        // Layer 2: Set of composite date|amount|merchant keys (normalized to avoid timezone drift)
        const existingCompositeKeys = new Set(
            (existing || []).map((t: any) => {
                const normalizedDate = t.date ? t.date.split('T')[0] : '';
                const normalizedAmount = Math.abs(Number(t.amount)).toFixed(2);
                const normalizedMerchant = (t.merchant || '').toLowerCase().trim();
                return `${normalizedDate}|${normalizedAmount}|${normalizedMerchant}`;
            })
        );

        let skippedByRefId = 0;
        let skippedByComposite = 0;
        let skippedByLocalDedup = 0;
        const dedupedTransactions: any[] = [];

        // Layer 0: Local tracking set — catches LLM hallucinated duplicates within the same chunk
        // Uses a stable composite key independent of volatile fields (category, method)
        const localProcessedKeys = new Set<string>();

        for (const tx of rawExtracted) {
            // Build a safe normalized date (handles both YYYY-MM-DD and partial strings like "17 Feb")
            let normalizedDateStr = '';
            if (tx.date) {
                const parsed = new Date(tx.date);
                const dateOnly = isNaN(parsed.getTime()) ? tx.date.trim() : parsed.toISOString().split('T')[0];
                normalizedDateStr = `${dateOnly}T12:00:00.000Z`;
            }
            const normalizedAmount = Math.abs(Number(tx.amount)).toFixed(2);
            const normalizedMerchant = (tx.merchant || '').toLowerCase().trim();
            const compositeKey = `${normalizedDateStr}|${normalizedAmount}|${normalizedMerchant}`;
            const refId = tx.referenceId?.toString().trim() || null;

            // ── Layer 0: Intra-chunk dedup (catches LLM hallucinated duplicates)
            if (localProcessedKeys.has(compositeKey)) {
                skippedByLocalDedup++;
                console.log(`[dedup] SKIP (intra-chunk hallucination): ${compositeKey}`);
                continue;
            }
            localProcessedKeys.add(compositeKey);

            // ── Layer 1 (Golden Rule): Reference ID match
            if (refId && existingRefIds.has(refId)) {
                skippedByRefId++;
                console.log(`[dedup] SKIP (refId match): ${refId} — ${tx.merchant} ${tx.amount}`);
                continue;
            }

            // ── Layer 2 (Fallback): Composite key match (date + amount + merchant)
            if (existingCompositeKeys.has(compositeKey)) {
                skippedByComposite++;
                console.log(`[dedup] SKIP (composite match): ${compositeKey}`);
                continue;
            }

            // ── New transaction — add to insert list and update in-memory sets
            dedupedTransactions.push(tx);
            if (refId) existingRefIds.add(refId);           // Guard against cross-chunk refId duplicates
            existingCompositeKeys.add(compositeKey);         // Guard against cross-chunk composite duplicates
        }

        console.log(`[dedup] ${rawExtracted.length} extracted | ${skippedByLocalDedup} intra-chunk | ${skippedByRefId} refId | ${skippedByComposite} composite | ${dedupedTransactions.length} new`);

        const toInsert = dedupedTransactions.map(tx => ({
            id: crypto.randomUUID(),
            userId,
            merchant: tx.merchant || 'Unknown',
            amount: tx.type === 'EXPENSE' ? -Math.abs(tx.amount) : Math.abs(tx.amount),
            category: VALID_CATEGORIES.has(tx.category) ? tx.category : 'Miscellaneous',
            date: (() => {
                if (!tx.date) return new Date().toISOString();
                const d = new Date(tx.date);
                return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
            })(),
            isAiScanned: true,
            referenceId: tx.referenceId?.toString().trim() || null,
        }));

        if (toInsert.length > 0) {
            try {
                await prisma.transaction.createMany({
                    data: toInsert
                });
                // console.log(`[scan] ✅ Inserted ${toInsert.length} new transactions into DB (Prisma)`);
            } catch (err: any) {
                console.error('[scan] Prisma Insert error:', err.message);
                return NextResponse.json({ error: `DB insert failed: ${err.message}` }, { status: 500 });
            }
        } else {
            console.log(`[scan] ℹ️ No new transactions to insert — all were duplicates`);
        }

        const frontendTransactions = toInsert.map(t => ({
            date: t.date.split('T')[0],
            merchant: t.merchant,
            amount: t.amount,
            category: t.category,
            type: t.amount < 0 ? 'Expense' : 'Income',
            referenceId: t.referenceId,
        }));

        return NextResponse.json({
            success: true,
            transactions: frontendTransactions,
            count: frontendTransactions.length,
            totalExtracted: rawExtracted.length,
            skippedByRefId,
            skippedByComposite,
            duplicatesSkipped: skippedByRefId + skippedByComposite,
        });

    } catch (error: any) {
        console.error('[scan] Fatal error:', error);
        return NextResponse.json({ error: error.message || 'Failed to process PDF' }, { status: 500 });
    }
}
