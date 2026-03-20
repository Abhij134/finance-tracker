"use server"

import { createClient } from "@/utils/supabase/server"
import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"

const novita = createOpenAI({
    baseURL: 'https://api.novita.ai/v3/openai',
    apiKey: process.env.NOVITA_API_KEY,
});

const groq = createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY,
});

export async function generateInsight(prompt: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    if (!userId) {
        throw new Error("Unauthorized");
    }

    if (!process.env.NOVITA_API_KEY) {
        throw new Error("Missing NOVITA_API_KEY in environment");
    }

    const { data: recentTxs, error } = await supabase
        .from('Transaction')
        .select('*')
        .eq('userId', userId)
        .order('date', { ascending: false });

    if (error) {
        throw new Error(error.message);
    }

    // Cleaned up transaction formatting so the AI reads it easier
    const txContext = recentTxs.length > 0
        ? recentTxs.map((tx: any) => `* Date: ${tx.date} | Merchant: ${tx.merchant} | Amount: $${tx.amount} | Category: ${tx.category}`).join('\n')
        : "No previous transactions found.";

    // The Upgraded "Brain" of Finance Neo
    const systemPrompt = `You are the elite Financial AI Assistant for 'Finance Neo'. 
Your tone is highly professional, direct, and analytical. 

DATA CONTEXT:
You analyze the user's finances based strictly on the manually entered transactions and scanned receipts provided below. 

CURRENT DATE: ${new Date().toLocaleDateString('en-CA')} (Treat transactions from this date as "today").

USER'S TRANSACTIONS (ALL TIME):
${txContext}

STRICT FORMATTING RULES:
1. NO FLUFF: Be EXTREMELY concise. Give short, highly meaningful, and directly relevant answers. Never use pleasantries, filler introductions, or robotic sign-offs. Give the bottom-line answer immediately.
2. REQUIRED SPACING: You MUST use double line breaks between paragraphs and list items to make the text easy to read.
3. STRICT REQUIREMENT: You MUST format ALL multi-sentence explanations, steps, or lists using MARKDOWN BULLET POINTS (use '-'). NEVER write long unbroken paragraphs. Break every distinct thought into a bullet point.

STRICT OUTPUT TEMPLATE:
[Write a natural, 1-2 sentence direct summary of your advice here. Do not use any labels like "Bottom Line:" or "Summary:"].

1. **Name of Point 1**: Details and explanation.

2. **Name of Point 2**: Details and explanation.

3. **Name of Point 3**: Details and explanation.

(CRITICAL: Do not output any literal brackets '[' or ']' in your response. strictly use '**' markdown for the bolded titles. Ensure you use numbers like '1.' and double line breaks between sections to trigger markdown lists).

4. EMPHASIS: Use bold text (**like this**) to highlight dollar amounts, merchant names, and key financial terms.
5. CLEAN UI: Do NOT output markdown tables, code blocks, emojis, or raw JSON symbols.

Provide the requested financial insight for the user's prompt now.`;

    const finalPrompt = prompt + "\n\n(IMPORTANT: You MUST answer using a bulleted list format. Every single point must start with exactly '- ' (dash and space) so the markdown parser renders a bullet point. Use an empty line between each bullet point for spacing.)";

    try {
        const { text } = await generateText({
            model: novita('qwen/qwen-2.5-72b-instruct'),
            system: systemPrompt,
            prompt: finalPrompt,
        });
        return text;
    } catch (novitaErr: any) {
        console.warn("Novita failed for insights action, trying Groq fallback:", novitaErr);
        try {
            const { text } = await generateText({
                model: groq('llama-3.3-70b-versatile'),
                system: systemPrompt,
                prompt: finalPrompt,
            });
            return text;
        } catch (groqErr: any) {
            console.error("All AI providers failed for insights action:", groqErr);
            throw new Error("Failed to generate insight. Please try again.");
        }
    }
}