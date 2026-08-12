// @ts-nocheck
import { createClient } from "@/utils/supabase/server";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import prisma from "@/lib/prisma";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Create custom OpenAI provider for Groq
const groq = createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY || 'MISSING_KEY',
});

// Model fallback chain: llama-3.1-8b-instant is ultra fast with a massive daily token limit.
const MODEL_FALLBACK_CHAIN = [
    'llama-3.1-8b-instant',      // Primary: ultra fast (800+ tok/s) + massive daily token quota
    'llama-3.3-70b-versatile',   // Fallback 1: deep reasoning when quota available
    'gemma2-9b-it',              // Fallback 2: separate model family
];

function sseError(message: string): Response {
    const safe = typeof message === 'string' ? message : 'Unknown error.';
    console.error('[sseError → sent to client]:', safe);
    return new Response(
        `event: error\ndata: ${JSON.stringify({ message: safe })}\n\n`,
        {
            status: 200,
            headers: {
                'Content-Type': 'text/event-stream; charset=utf-8',
                'Cache-Control': 'no-store',
            },
        }
    );
}

export async function POST(req: Request) {
    let startTime = Date.now();
    console.log('[Chat POST] request start');
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;

        if (!userId) {
            console.warn('[Chat POST] Supabase getUser() returned no user — returning SSE auth error.');
            return sseError('Please sign in again (session not found).');
        }

        try {
            await prisma.user.upsert({
                where: { id: userId },
                update: {},
                create: {
                    id: userId,
                    email: user.email || `${userId}@user.local`,
                    name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
                }
            });
        } catch (uErr) {
            console.warn('[Chat POST] ensureUserExists warning:', uErr);
        }

        let payload;
        try {
            payload = await req.json();
        } catch (jsonErr: any) {
            console.error('[Chat POST] Failed to parse JSON body:', jsonErr);
            return sseError('Bad request: could not read your message (JSON parse error).');
        }
        const messages = payload?.messages;

        if (!messages || !Array.isArray(messages)) {
            console.warn('[Chat POST] payload.messages missing or not array.');
            return sseError('Bad request: malformed message payload.');
        }

        // Fetch recent transactions (last 50) and budgets for smart aggregation
        const [txResult, budgetResult] = await Promise.all([
            supabase
                .from('Transaction')
                .select('date, merchant, amount, category')
                .eq('userId', userId)
                .order('date', { ascending: false })
                .limit(50),
            supabase
                .from('Budget')
                .select('category, amount')
                .eq('userId', userId)
        ]);

        const recentTxs = txResult.data || [];
        const budgets = budgetResult.data || [];

        // Aggregate transactions by category & merchant to prevent token bloat & repetitive bullet spams
        const categoryTotals: Record<string, number> = {};
        const merchantMap: Record<string, { count: number; total: number; category: string }> = {};

        for (const tx of recentTxs) {
            const cat = tx.category || 'Uncategorized';
            const amt = Math.abs(Number(tx.amount) || 0);
            categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;

            const merchantKey = (tx.merchant || 'Unknown').trim();
            if (!merchantMap[merchantKey]) {
                merchantMap[merchantKey] = { count: 0, total: 0, category: cat };
            }
            merchantMap[merchantKey].count += 1;
            merchantMap[merchantKey].total += amt;
        }

        const categorySummary = Object.entries(categoryTotals).length > 0
            ? Object.entries(categoryTotals)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, total]) => `• ${cat}: ₹${total.toFixed(2)}`)
                .join('\n')
            : 'No transaction data yet.';

        const topMerchantsSummary = Object.entries(merchantMap).length > 0
            ? Object.entries(merchantMap)
                .sort((a, b) => b[1].total - a[1].total)
                .slice(0, 10)
                .map(([m, d]) => `• ${m} (${d.category}): ₹${d.total.toFixed(2)}${d.count > 1 ? ` (${d.count}x transactions)` : ''}`)
                .join('\n')
            : 'No recent merchants.';

        const budgetSummary = budgets.length > 0
            ? budgets.map((b: any) => `${b.category}: ₹${Number(b.amount).toFixed(2)}`).join(' | ')
            : 'No budgets set yet.';

        const today = new Date().toISOString().split('T')[0];

        const systemPrompt = `You are FinanceNeo AI — an expert personal finance advisor. Today is ${today}.

FORMATTING & RESPONSE RULES (FOLLOW STRICTLY):
1. **NO REPETITIVE LISTING (CRITICAL)**:
   - NEVER list out identical or repetitive micro-transactions line by line (e.g. NEVER output multiple bullet points for repeated ₹30 UPI payments to the same recipient).
   - Group spending into clear categories and top merchant totals instead of dumping raw transaction lists.
2. **OPTIMAL SAVINGS & BUDGET SOLUTIONS**:
   - Whenever the user asks about spending, budgets, or saving money, ALWAYS provide **2-3 optimal, practical, and realistic solutions** to stay under budget and save.
   - Specifically highlight high-frequency small payments (like frequent daily UPI transfers or food deliveries) as prime areas to save money.
3. **RICH MARKDOWN FORMATTING**:
   - Always highlight monetary values (e.g. **₹8,200**), percentages, and category names in **bold text**.
   - Use bullet points (\`-\` or \`•\`) for lists and recommendations.
   - Use double line breaks between paragraphs for clean readability.
   - Use relevant emojis (🍔 Food, 🛒 Groceries, 💼 Income, 🚗 Transport, 💡 Saving Solutions, 📊 Summary).
4. **CURRENCY**: Always use **₹** for monetary amounts.

USER FINANCIAL DATA:
Category Spend Totals:
${categorySummary}

Top Merchants & Recipients (Aggregated):
${topMerchantsSummary}

Monthly Budgets Set:
${budgetSummary}
`;

        let coreMessages = [];
        for (const m of messages) {
            let text;
            if (typeof m.content === 'string' && m.content.trim().length > 0) {
                text = m.content;
            } else if (Array.isArray(m.parts)) {
                text = m.parts.map((p: any) => {
                    if (typeof p === 'string') return p;
                    if (p?.text) return p.text;
                    return '';
                }).filter(Boolean).join('\n');
            } else {
                continue;
            }
            if (!text || !text.trim()) {
                continue;
            }
            coreMessages.push({ role: m.role, content: text });
        }

        if (coreMessages.length > 0 && coreMessages[0].role === 'assistant') {
            coreMessages = coreMessages.slice(1);
        }

        if (coreMessages.length === 0 || !coreMessages.some((m: any) => m.role === 'user')) {
            coreMessages = [{ role: 'user', content: 'Hi, who are you?' }, ...coreMessages];
        }

        const GROQ_KEY = process.env.GROQ_API_KEY;
        if (!GROQ_KEY || GROQ_KEY === 'MISSING_KEY' || GROQ_KEY.trim().length < 8) {
            console.error('[Chat POST] GROQ_API_KEY is missing/invalid.');
            return sseError('Server configuration error: AI service API key is missing.');
        }

        let result;
        let lastStreamErr: any = null;
        for (const modelId of MODEL_FALLBACK_CHAIN) {
            try {
                console.log(`[Chat POST] Trying model: ${modelId}`);
                result = streamText({
                    model: groq.chat(modelId),
                    system: systemPrompt,
                    messages: coreMessages,
                    maxTokens: 600,
                    temperature: 0.3,
                    abortSignal: req.signal,
                    onError: (e: any) => {
                        console.error(`[AI streamText onError (${modelId})]`, e?.message || e);
                    },
                });
                lastStreamErr = null;
                break;
            } catch (streamErr: any) {
                lastStreamErr = streamErr;
                const isRateLimit = streamErr?.cause?.statusCode === 429
                    || streamErr?.statusCode === 429
                    || (streamErr?.message || '').includes('rate_limit_exceeded')
                    || (streamErr?.message || '').includes('Rate limit');
                if (isRateLimit) {
                    console.warn(`[Chat POST] Model ${modelId} rate-limited (429). Trying next fallback…`);
                    continue;
                }
                console.error('[Chat POST] streamText() threw a non-rate-limit error:', streamErr?.message || streamErr);
                return sseError('AI engine error: ' + (streamErr?.message || 'Request failed — please retry.'));
            }
        }

        if (!result) {
            const retryMsg = lastStreamErr?.errors?.[0]?.message || lastStreamErr?.message || '';
            const retryIn = retryMsg.match(/try again in (.+?)\./i)?.[1] || 'a few minutes';
            console.error('[Chat POST] All fallback models exhausted. Last error:', lastStreamErr?.message);
            return sseError(`The AI is temporarily over its usage limit. Please try again in ${retryIn}.`);
        }

        const response = result.toUIMessageStreamResponse({
            headers: { 'Cache-Control': 'no-store' }
        });
        console.log(`[Chat POST] → streaming response. took=${Date.now() - startTime}ms`);
        return response;
    } catch (error: any) {
        console.error("Fatal AI Chat Error:", error?.stack || error);
        const message = error?.message?.length ? error.message : 'AI request failed. Please try again.';
        return sseError(message);
    }
}
