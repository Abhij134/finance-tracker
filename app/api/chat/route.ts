import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 60; // Allow up to 60 seconds for AI processing
export const dynamic = 'force-dynamic';

// Strict Environment Variable Validation
if (!process.env.NOVITA_API_KEY) {
    console.error("❌ FATAL: NOVITA_API_KEY is missing from .env.local or server needs a restart.");
}
if (!process.env.GOOGLE_GEMINI_API_KEY) {
    console.error("❌ FATAL: GOOGLE_GEMINI_API_KEY is missing from .env.local or server needs a restart.");
}

// Initialize the Primary Client (Novita)
const novita = new OpenAI({
    apiKey: process.env.NOVITA_API_KEY || 'MISSING_KEY',
    baseURL: 'https://api.novita.ai/v3/openai',
});

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;

        if (!userId) {
            return new Response("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        if (!body || !body.messages) {
            console.error("❌ Missing messages array in payload");
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        const { messages: rawMessages } = body;

        // Globally sanitize and overwrite the messages array
        const cleanMessages = (rawMessages || [])
            .filter((msg: any) => msg.role === 'user' || msg.role === 'assistant')
            .map((msg: any) => {
                let flatContent = "";
                if (typeof msg.content === 'string') {
                    flatContent = msg.content;
                } else if (Array.isArray(msg.content)) {
                    flatContent = msg.content.map((c: any) => c.text || '').join(' ');
                } else {
                    flatContent = String(msg.content || "");
                }
                return {
                    role: msg.role as 'user' | 'assistant',
                    content: flatContent.trim()
                };
            })
            .filter((msg: any) => msg.content.length > 0);

        while (cleanMessages.length > 0 && cleanMessages[0].role === 'assistant') {
            cleanMessages.shift();
        }

        const [txResult, budgetResult] = await Promise.all([
            supabase
                .from('Transaction')
                .select('date, merchant, amount, category')
                .eq('userId', userId)
                .order('date', { ascending: false })
                .limit(100),
            supabase
                .from('Budget')
                .select('category, limit')
                .eq('userId', userId)
        ]);

        const recentTxs = txResult.data || [];
        const budgets = budgetResult.data || [];

        // Convert to a clean, token-efficient string
        const userDataContext = JSON.stringify({
            transactions: recentTxs.map((tx: any) => ({
                date: tx.date,
                merchant: tx.merchant,
                amount: tx.amount,
                category: tx.category
            })),
            budgets: budgets.map((b: any) => ({
                category: b.category,
                limit: b.limit
            }))
        });

        const today = new Date().toISOString().split('T')[0];

        const systemPrompt = `You are FinanceNeo's elite personal finance analyst. Today's date is ${today}. Answer in plain, friendly English — like a smart, proactive financial planner.

STRICT FORMAT RULES (never break these):
- Explain things extremely simply, so anyone can understand. No LaTeX or math notation ever.
- Lead with the direct answer, then brief supporting numbers.
- Use ₹ for all currency.
- Keep total response concise unless the user asks for a detailed plan.
- At the very end, append exactly 3 follow-up suggestions formatted EXACTLY like this:
---SUGGESTIONS---
Question 1?
Question 2?
Question 3?
IMPORTANT: These suggestions MUST be phrased from the USER'S perspective, asking YOU (the AI) a question. For example: "How can I set financial goals for this year?", "Can you help me plan a specific expense?", or "What is my average monthly spending?". DO NOT suggest questions that you would ask the user.

CORE ANALYSIS DIRECTIVES (Apply if relevant to user's question):
1. PREDICT MONTHLY SPEND: When discussing budgets or spending, you MUST calculate their current "daily burn rate" based on expenses so far this month, and predict if they will be OVER or UNDER budget by month-end. State exact projected amounts.
2. ACTIONABLE SAVING OPTIONS: Never just say "you are overspending". You MUST suggest 2-3 specific, logical options to cut back (e.g., "Reduce dining out by ₹500/week to get back under budget").
3. PURCHASE PLANNING (Can I buy X?): If a user asks to buy a specific item, calculate their current average monthly savings rate. Advise them EXACTLY how many months they need to save to afford it safely, and suggest which budget categories to temporarily reduce to speed it up.

Only use the real data provided below. Do your math carefully step-by-step internally before outputting the final numbers. If they have no budgets set, explicitly tell them.

USER FINANCIAL DATA: ${userDataContext}
`;

        const messagesWithContext = [
            { role: "system", content: systemPrompt },
            ...cleanMessages
        ];

        try {
            // console.log("Attempting Primary Provider: Novita AI...");
            const response = await novita.chat.completions.create({
                model: 'qwen/qwen-2.5-72b-instruct',
                messages: messagesWithContext as any,
                max_tokens: 1000,
                temperature: 0.7,
            });
            return NextResponse.json({ message: response.choices[0].message.content });
        } catch (novitaError) {
            console.error("Novita failed:", novitaError);
            return NextResponse.json(
                { error: "AI services are currently unreachable. Please try again later." },
                { status: 503 }
            );
        }
    } catch (error) {
        console.error("Fatal AI Chat Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error." },
            { status: 500 }
        );
    }
}
