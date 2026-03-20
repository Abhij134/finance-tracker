import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/prisma';

// NOTE: Node.js runtime — NOT edge. Required for sequential processing + Supabase.

// ─── PROVIDER TOGGLE ───────────────────────────────────────────────────────────
// Switch to 'gemini' when Gemini quota resets tomorrow.
const ACTIVE_PROVIDER: 'groq' | 'gemini' = 'groq';
const MODEL = ACTIVE_PROVIDER === 'groq' ? 'llama-3.1-8b-instant' : 'gemini-1.5-flash';

const aiClient = new OpenAI({
    baseURL: ACTIVE_PROVIDER === 'groq'
        ? 'https://api.groq.com/openai/v1'
        : 'https://generativelanguage.googleapis.com/v1beta/openai/',
    apiKey: ACTIVE_PROVIDER === 'groq'
        ? process.env.GROQ_API_KEY
        : process.env.GOOGLE_GEMINI_API_KEY,
    maxRetries: 0, // MANDATORY: Prevents silent retry loops that drain API quotas
});

const CHUNK_SIZE = 5000; // Matches frontend chunking (5000 chars ≈ 1250 tokens for Groq)
const INTER_CHUNK_DELAY_MS = 25000; // 25s delay to respect Groq TPM limits

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
    const systemPrompt = `Extract financial transactions from bank statement text. Today's date is ${new Date().toISOString().split('T')[0]}. If the year is missing in the statement, assume it is ${new Date().getFullYear()}. Return ONLY valid JSON, no markdown/backticks.

FORMAT: {"transactions":[{"date":"YYYY-MM-DD","amount":<positive number>,"merchant":"<string>","category":"<string>","type":"Expense"|"Income","referenceId":"<UTR/UPI Ref/Txn ID/Cheque No or null>"}]}

CATEGORIZE BY MERCHANT/NARRATIVE — use these exact labels:
- Food & Dining: Swiggy, Zomato, restaurants, cafes, chai, bakery, pizza, biryani, KFC, McDonald's, Dominos, Starbucks, dhaba, canteen, mess
- Groceries: BigBasket, Blinkit, Zepto, DMart, Reliance Fresh, grocery, kirana, supermarket, JioMart, Spencer's
- Shopping: Amazon, Flipkart, Myntra, Ajio, Meesho, Nykaa, mall, clothing, electronics, Croma, Reliance Digital, Apple, Google
- Transport: Ola, Uber, Rapido, metro, railway, bus, cab, auto, NCMC
- Fuel & Auto: petrol, diesel, HP, BPCL, IOCL, fuel station, car wash, service center, FASTag, toll, parking
- Travel: MakeMyTrip, airline, hotel, Indigo, SpiceJet, Air India, booking.com, resort
- Health & Medical: hospital, pharmacy, Apollo, Practo, PharmEasy, 1mg, doctor, clinic, lab test, medicine, dentist, Medplus
- Bills & Utilities: electricity, water, gas, broadband, Jio, Airtel, Vi, BSNL, recharge, DTH, Tata Play, WiFi, internet
- Entertainment: Cinema, PVR, INOX, movies, gaming, park, hobby, club, bar, liquor
- Education: school, college, university, Udemy, Coursera, coaching, tuition, books, stationery, exam fee
- UPI Transfer: UPI transfer OUT, NEFT, IMPS, RTGS sent where it is a personal transfer.
- Income: salary, interest, refund, cashback, "received from", "credited by"
- Investment: SIP, mutual fund, Zerodha, Groww, stocks, FD, gold, insurance premium
- Subscriptions: Netflix, Spotify, Hotstar, Prime, YouTube, Cloud storage, SaaS
- Rent & Housing: Rent payment, society maintenance, domestic help, house repair
- Other: if none of the above match reasonably

TYPE RULES: Expense=debit/withdrawal/payment/DR/"- Rs." | Income=credit/received/salary/CR/"+ Rs."/"Credited"
REFERENCE ID: Extract UTR/UPI Ref/Txn ID/Cheque No if visible, else null.
ONE transaction per statement line. No duplicates. Empty text → {"transactions":[]}`;

    const response = await aiClient.chat.completions.create({
        model: MODEL,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Extract all financial transactions from this text:\n\n${text}` },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
    });

    let rawContent = response.choices[0]?.message?.content || '{"transactions":[]}';

    // Strip markdown wrappers open-source models sometimes add
    rawContent = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
        const parsed = JSON.parse(rawContent);
        return Array.isArray(parsed) ? parsed : (parsed.transactions || []);
    } catch (e) {
        console.error(`[scan] Failed to parse AI output:`, rawContent.slice(0, 500));
        return [];
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

        const apiKey = ACTIVE_PROVIDER === 'groq' ? process.env.GROQ_API_KEY : process.env.GOOGLE_GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: `Missing ${ACTIVE_PROVIDER === 'groq' ? 'GROQ_API_KEY' : 'GOOGLE_GEMINI_API_KEY'}` }, { status: 500 });
        }

        // ─── CHUNKING ─────────────────────────────────────────────────────────────
        // Note: If frontend already chunked, this will be a single chunk (5000 chars).
        // If fullText is sent directly, this splits it server-side.
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
                console.log(`[scan] Chunk ${i + 1}: +${txs.length} tx (running total: ${rawExtracted.length})`);
            } catch (err: any) {
                console.error(`[scan] Chunk ${i + 1} failed:`, err.message);
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
            amount: tx.type === 'Expense' ? -Math.abs(tx.amount) : Math.abs(tx.amount),
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
