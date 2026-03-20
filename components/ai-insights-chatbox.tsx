"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, Loader2, Sparkles, AlertCircle, PauseCircle, Reply, X } from "lucide-react";
import ReactMarkdown from "react-markdown";

const CustomBotIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`bot-icon ${className || ""}`}
    >
        <path d="M12 8V4H8" />
        <rect width="16" height="12" x="4" y="8" rx="2" />
        <path d="M2 14h2" />
        <path d="M20 14h2" />
        <circle cx="12" cy="4" r="2" className="antenna-dot text-emerald-500 fill-emerald-500 stroke-none" />
        <line x1="9" y1="13" x2="9" y2="15" className="eye-l text-emerald-400 stroke-current" strokeWidth="3" />
        <line x1="15" y1="13" x2="15" y2="15" className="eye-r text-emerald-400 stroke-current" strokeWidth="3" />
    </svg>
);

type Message = {
    id: string;
    role: "user" | "ai";
    content: string;
    replyToContext?: string;
    suggestions?: string[];
};

export function AiInsightsChatbox() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "initial",
            role: "ai",
            content: "Hello! I'm FinanceNeo, you can ask me anything related to your finance."
        }
    ]);

    // Load chat history from session storage on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = sessionStorage.getItem("financeneo_chat_history");
            if (saved) {
                try {
                    setMessages(JSON.parse(saved));
                } catch (e) {
                    console.error("Failed to parse chat history", e);
                }
            }
        }
    }, []);

    // Save chat history to session storage whenever it changes
    useEffect(() => {
        if (typeof window !== "undefined") {
            sessionStorage.setItem("financeneo_chat_history", JSON.stringify(messages));
        }
    }, [messages]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [chatError, setChatError] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        const msg = input.trim();
        setInput("");
        await sendQuery(msg);
    };

    const sendQuery = async (presetContent: string) => {
        if (isLoading) return;

        // Ensure input field is cleared regardless of how the message was sent (typing vs clicking suggestion)
        setInput("");

        const userMsg = presetContent;
        setChatError(null);

        // Optimistically add user message
        const newMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: userMsg,
            replyToContext: replyingTo ? replyingTo.content : undefined
        };
        const newMessages: Message[] = [...messages, newMessage];
        setMessages(newMessages);
        setReplyingTo(null);
        setIsLoading(true);

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            // Filter out any accidental error messages before sending
            const cleanMessages = newMessages.filter(
                (msg) => !msg.content.startsWith("Error:") && !msg.content.includes("Could not connect") && !msg.content.includes("Failed to give insight") && !msg.content.includes("encountered a small glitch")
            );

            // Send only the last 6 messages to avoid payload limits
            const recentMessages = cleanMessages.slice(-6);

            const apiMessages = recentMessages
                .filter(m => m.id !== "initial")
                .map(m => ({
                    role: m.role === "ai" ? "assistant" : "user",
                    content: m.replyToContext && m.role === "user"
                        ? `Context I am replying to: "${m.replyToContext}"\n\nMy Question: ${m.content}`
                        : m.content
                }));

            console.log("Sending payload:", JSON.stringify({ messages: apiMessages }));

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: apiMessages }),
                signal: abortController.signal
            });

            if (!res.ok) {
                console.log("API Error Status:", res.status);
                let errorMessage = `API Route Failed with status: ${res.status}`;
                try {
                    const fallbackData = await res.json();
                    if (fallbackData?.error) {
                        errorMessage = fallbackData.error;
                    } else if (fallbackData?.content) {
                        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "ai", content: fallbackData.content }]);
                        return;
                    }
                } catch {
                    // JSON parsing failed or wasn't provided, throw generic
                }
                throw new Error(errorMessage);
            }

            const data = await res.json();

            if (data?.content || data?.message) {
                const rawText = data.content || data.message;

                // Parse suggestions
                let cleanContent = rawText;
                let parsedSuggestions: string[] = [];

                const suggestionIndex = rawText.indexOf('---SUGGESTIONS---');
                if (suggestionIndex !== -1) {
                    cleanContent = rawText.substring(0, suggestionIndex).trim();
                    const suggestionsText = rawText.substring(suggestionIndex + '---SUGGESTIONS---'.length).trim();
                    parsedSuggestions = suggestionsText
                        .split('\n')
                        .map((s: string) => s.replace(/^[-*•\d.)]\s*/, '').trim())
                        .filter((s: string) => s.length > 0)
                        .slice(0, 3); // max 3
                }

                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: "ai",
                    content: cleanContent,
                    suggestions: parsedSuggestions.length > 0 ? parsedSuggestions : undefined
                }]);
            } else {
                throw new Error("Invalid response format");
            }

        } catch (err: any) {
            console.error("Chatbox fetch error:", err);
            if (err.name !== 'AbortError') {
                setChatError(err.message || "Could not connect to FinanceNeo AI. Please try again later.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const cancelGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setIsLoading(false);
        }
    };

    return (
        <section className="flex flex-col h-[75vh] min-h-[500px] w-full max-w-5xl mx-auto relative rounded-3xl overflow-hidden shadow-2xl bg-[#0B0F19]/98 backdrop-blur-3xl border border-border">
            <style dangerouslySetInnerHTML={{
                __html: `
/* Bot float */
.bot-icon { animation: bot-float 3.2s ease-in-out infinite; }
.bot-chip:hover .bot-icon { animation: bot-float-fast 1.8s ease-in-out infinite; }

@keyframes bot-float {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-3px); }
}
@keyframes bot-float-fast {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  25%       { transform: translateY(-4px) rotate(1deg); }
  75%       { transform: translateY(-2px) rotate(-1deg); }
}

/* Antenna pulse */
.antenna-dot { animation: pulse-ant 2.4s ease-in-out infinite; }
@keyframes pulse-ant {
  0%, 100% { opacity: .6; r: 1.5; }
  50%       { opacity: 1;  r: 2.5; }
}

/* Eye blink */
.eye-l, .eye-r { animation: blink 4s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
@keyframes blink {
  0%, 90%, 100% { transform: scaleY(1); }
  95%           { transform: scaleY(0.1); }
}
            `}} />
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-[#0B0F19]/90 backdrop-blur-md px-6 py-4 shrink-0 z-10 transition-all">
                <div className="flex items-center gap-3">
                    <div className="bot-chip p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-colors hover:bg-emerald-500/20 cursor-default">
                        <CustomBotIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold leading-none text-foreground tracking-tight">FinanceNeo AI</h2>
                        <p className="text-xs text-muted-foreground mt-1 font-medium tracking-wide w-full flex items-center gap-1"><Sparkles className="h-3 w-3 text-emerald-500" />Live Financial Analysis</p>
                    </div>
                </div>
            </div>

            {/* Chat History Window */}
            <div className="flex flex-1 overflow-hidden relative">
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth pb-4 custom-scrollbar"
                >
                    {messages.map((m) => (
                        <div
                            key={m.id}
                            className={`flex w-full group ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`flex max-w-[95%] gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end`}>
                                {/* Avatar */}
                                {m.role === 'ai' && (
                                    <div className="bot-chip shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)] transition-colors hover:bg-emerald-500/20 cursor-default">
                                        <CustomBotIcon className="h-4 w-4" />
                                    </div>
                                )}

                                {/* Message Container */}
                                <div className={`flex flex-col relative min-w-0 w-fit ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    {m.replyToContext && (
                                        <div className={`text-[11px] p-2.5 rounded-lg mb-1 border-l-2 truncate max-w-full italic
                                        ${m.role === 'user' ? 'bg-emerald-900/40 border-emerald-500/40 text-emerald-100' : 'bg-muted/50 border-border text-muted-foreground'}`}>
                                            {m.replyToContext}
                                        </div>
                                    )}
                                    <div
                                        className={`text-sm break-words px-4 py-3 shadow-md w-fit ${m.role === 'user'
                                            ? 'bg-emerald-600 text-white rounded-2xl rounded-br-sm'
                                            : 'bg-muted/50 backdrop-blur-md border border-border text-foreground rounded-2xl rounded-bl-sm'
                                            }`}
                                    >
                                        {m.role === 'user' ? (
                                            <div className="leading-relaxed whitespace-pre-wrap">{m.content}</div>
                                        ) : (
                                            <div className="text-[14px] leading-relaxed whitespace-pre-wrap">
                                                <ReactMarkdown
                                                    components={{
                                                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                                        ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-0.5 marker:text-emerald-400" {...props} />,
                                                        ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5 marker:text-emerald-400 font-semibold" {...props} />,
                                                        li: ({ node, ...props }) => <li className="pl-1 font-normal" {...props} />,
                                                        strong: ({ node, ...props }) => <strong className="text-emerald-300 font-bold" {...props} />,
                                                    }}
                                                >
                                                    {m.content}
                                                </ReactMarkdown>

                                                {/* Suggested Questions */}
                                                {m.suggestions && m.suggestions.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-2">
                                                        {m.suggestions.map((sug, idx) => (
                                                            <button
                                                                key={idx}
                                                                onClick={() => {
                                                                    sendQuery(sug);
                                                                }}
                                                                className="text-xs bg-background hover:bg-muted border border-border text-foreground px-3 py-1.5 rounded-full transition-all text-left flex items-center gap-1.5 shadow-sm"
                                                            >
                                                                <Sparkles className="h-3 w-3 shrink-0 text-emerald-500" />
                                                                <span>{sug}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Hidden Reply Action Button that appears on hover */}
                                <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center shrink-0 mb-1 ${m.role === 'user' ? 'mr-1' : 'ml-1'}`}>
                                    <button
                                        onClick={() => setReplyingTo(m)}
                                        title="Reply"
                                        className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 text-gray-400 hover:text-white transition-all backdrop-blur-md shadow-lg"
                                    >
                                        <Reply className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {isLoading && messages[messages.length - 1]?.role !== 'ai' && (
                        <div className="flex w-full justify-start">
                            <div className="flex max-w-[85%] md:max-w-[75%] gap-3 flex-row items-end">
                                <div className="bot-chip shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)] transition-colors hover:bg-emerald-500/20 cursor-default">
                                    <CustomBotIcon className="h-4 w-4" />
                                </div>
                                <div className="flex items-center gap-3 bg-muted/60 backdrop-blur-xl border border-border text-foreground shadow-sm rounded-2xl rounded-tl-sm p-4">
                                    <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                                    <span className="font-medium animate-pulse text-muted-foreground">Analyzing your finances...</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>


            </div>

            {/* Input Area (Bottom Dock) */}
            <div className="shrink-0 border-t border-border bg-muted/30 backdrop-blur-md px-4 md:px-6 py-4 z-20 transition-all">
                <div className="w-full max-w-3xl mx-auto flex flex-col">
                    {chatError && (
                        <div className="mb-2 w-full text-center group bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 justify-center shadow-sm">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>{chatError}</span>
                            <button onClick={() => setChatError(null)} className="ml-auto hover:text-red-300 p-0.5 rounded-full hover:bg-red-500/20 transition-colors">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {replyingTo && (
                        <div className="mb-2 self-start flex items-center justify-between text-xs bg-muted/80 backdrop-blur-xl border border-border p-2.5 rounded-xl text-foreground shadow-md ml-4">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <Reply className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span className="font-bold text-foreground shrink-0">{replyingTo.role === 'ai' ? 'FinanceNeo' : 'You'}:</span>
                                <span className="truncate max-w-[150px] md:max-w-[300px] italic text-muted-foreground">"{replyingTo.content}"</span>
                            </div>
                            <button onClick={() => setReplyingTo(null)} className="hover:text-foreground p-1 ml-3 shrink-0 bg-background hover:bg-muted rounded-full transition-colors border border-border">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}


                    <form onSubmit={handleSubmit} className="flex gap-2 relative mt-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isLoading}
                            placeholder="Ask about your transactions..."
                            className="bg-background text-foreground placeholder-muted-foreground border border-border rounded-xl px-4 py-2.5 w-full text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 transition-all shadow-sm"
                        />
                        {isLoading ? (
                            <button
                                type="button"
                                onClick={cancelGeneration}
                                className="shrink-0 bg-red-500 hover:bg-red-600 text-white h-full min-h-[38px] px-3 rounded-xl flex items-center justify-center transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                            >
                                <PauseCircle className="h-4 w-4" />
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={!input.trim()}
                                className="shrink-0 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 h-[38px] w-[38px] rounded-xl flex items-center justify-center font-bold tracking-wide transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:shadow-none hover:scale-105 active:scale-95 text-sm"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        )}
                    </form>
                </div>
            </div>
        </section >
    );
}
