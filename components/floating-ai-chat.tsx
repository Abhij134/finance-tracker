"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, Sparkles, AlertCircle, PauseCircle, Reply, X, ChevronUp, ChevronDown } from "lucide-react";
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

export function FloatingAiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial",
      role: "ai",
      content: "Hello! I'm FinanceNeo AI. Ask me anything about your finances — spending patterns, budgets, savings tips, or transaction analysis.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("financeneo_chat_history");
      if (saved) { try { setMessages(JSON.parse(saved)); } catch { } }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("financeneo_chat_history", JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 320);
  }, [isOpen]);

  const sendQuery = async (content: string) => {
    if (isLoading || !content.trim()) return;
    setInput("");
    setChatError(null);

    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      replyToContext: replyingTo?.content,
    };
    const newMessages = [...messages, newMessage];
    setMessages(newMessages);
    setReplyingTo(null);
    setIsLoading(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const apiMessages = newMessages
        .filter((m) => m.id !== "initial" && !m.content.startsWith("Error:"))
        .slice(-6)
        .map((m) => ({
          role: m.role === "ai" ? "assistant" : "user",
          content: m.replyToContext && m.role === "user"
            ? `Context: "${m.replyToContext}"\n\nQuestion: ${m.content}`
            : m.content,
        }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
        signal: ctrl.signal,
      });

      if (!res.ok) throw new Error(`Error: ${res.status}`);
      const data = await res.json();

      if (data?.content || data?.message) {
        const rawText = data.content || data.message;
        let cleanContent = rawText;
        let suggestions: string[] = [];
        const si = rawText.indexOf("---SUGGESTIONS---");
        if (si !== -1) {
          cleanContent = rawText.substring(0, si).trim();
          suggestions = rawText.substring(si + 17).trim()
            .split("\n").map((s: string) => s.replace(/^[-*•\d.)]\s*/, "").trim())
            .filter((s: string) => s.length > 0).slice(0, 3);
        }
        setMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "ai",
          content: cleanContent,
          suggestions: suggestions.length > 0 ? suggestions : undefined,
        }]);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") setChatError(err.message || "Connection failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const aiCount = messages.filter((m) => m.role === "ai" && m.id !== "initial").length;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setIsOpen(false)} />
      )}

      {/* ── Chat panel — drops down from top-right ─────────────────── */}
      <div
        className="fixed top-[120px] right-4 z-50 w-[calc(100vw-2rem)] sm:w-[380px] md:w-[420px]"
        style={{
          // Spring pop: scale from 0.85 + translateY(-8px) → full size
          transform: isOpen ? "translateY(0) scale(1)" : "translateY(-12px) scale(0.88)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transformOrigin: "top right",
          transition: isOpen
            ? "transform 0.32s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease"
            : "transform 0.2s cubic-bezier(0.4,0,1,1), opacity 0.15s ease",
        }}
      >
        <div
          className="flex flex-col rounded-2xl border border-border bg-[#0B0F19]/98 backdrop-blur-3xl overflow-hidden shadow-2xl shadow-black/80"
          style={{ height: "min(540px, calc(100dvh - 80px))" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0 bg-gradient-to-r from-emerald-950/80 to-[#0B0F19]/98">
            <div className="flex items-center gap-3">
              <div className="bot-chip p-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 shrink-0">
                <CustomBotIcon className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground leading-none">Chat with FinanceNeo</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.9)]" />
                  <span className="text-[10px] text-emerald-400 font-medium">AI · Live Financial Analysis</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all active:scale-90"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            {messages.map((m) => (
              <div key={m.id} className={`flex w-full group ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`flex max-w-[88%] gap-2 ${m.role === "user" ? "flex-row-reverse" : "flex-row"} items-end`}>
                  {m.role === "ai" && (
                    <div className="bot-chip shrink-0 h-6 w-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                      <CustomBotIcon className="h-3 w-3" />
                    </div>
                  )}
                  <div className={`flex flex-col min-w-0 ${m.role === "user" ? "items-end" : "items-start"}`}>
                    {m.replyToContext && (
                      <div className="text-[10px] px-2 py-1 rounded-md mb-1 border-l-2 italic truncate max-w-full bg-muted/50 border-emerald-500/30 text-muted-foreground">
                        {m.replyToContext.slice(0, 50)}...
                      </div>
                    )}
                    <div className={`text-xs break-words px-3 py-2 ${m.role === "user"
                      ? "bg-emerald-600 text-white rounded-2xl rounded-br-sm shadow-md shadow-emerald-900/40"
                      : "bg-muted/60 border border-border/60 text-foreground rounded-2xl rounded-bl-sm"
                      }`}>
                      {m.role === "user" ? (
                        <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                      ) : (
                        <div className="leading-relaxed">
                          <ReactMarkdown components={{
                            p: ({ node, ...props }) => <p className="mb-1.5 last:mb-0" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-disc pl-3 mb-1.5 space-y-0.5 marker:text-emerald-400" {...props} />,
                            ol: ({ node, ...props }) => <ol className="list-decimal pl-3 mb-1.5 marker:text-emerald-400" {...props} />,
                            li: ({ node, ...props }) => <li className="pl-0.5" {...props} />,
                            strong: ({ node, ...props }) => <strong className="text-emerald-300 font-bold" {...props} />,
                          }}>
                            {m.content}
                          </ReactMarkdown>
                          {m.suggestions && m.suggestions.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-border/50 flex flex-col gap-1">
                              {m.suggestions.map((sug, idx) => (
                                <button key={idx} onClick={() => sendQuery(sug)}
                                  className="text-[11px] bg-background/80 hover:bg-muted border border-border hover:border-emerald-500/40 text-foreground px-2.5 py-1.5 rounded-lg transition-all text-left flex items-center gap-1.5">
                                  <Sparkles className="h-2.5 w-2.5 shrink-0 text-emerald-500" />{sug}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mb-1">
                    <button onClick={() => setReplyingTo(m)}
                      className="p-1 rounded-full bg-muted border border-border text-muted-foreground hover:text-foreground">
                      <Reply className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-2 items-end">
                  <div className="bot-chip h-6 w-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                    <CustomBotIcon className="h-3 w-3" />
                  </div>
                  <div className="flex items-center gap-1.5 bg-muted/60 border border-border/60 rounded-2xl rounded-bl-sm px-3 py-2.5">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-1.5 w-1.5 rounded-full bg-emerald-500/70 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-border bg-card/90 px-3 py-2.5">
            {chatError && (
              <div className="mb-2 text-[11px] bg-red-500/10 border border-red-500/20 text-red-400 px-2.5 py-1.5 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span className="flex-1 truncate">{chatError}</span>
                <button onClick={() => setChatError(null)}><X className="h-3 w-3" /></button>
              </div>
            )}
            {replyingTo && (
              <div className="mb-2 flex items-center justify-between text-[11px] bg-muted border border-border px-2.5 py-1.5 rounded-lg">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <Reply className="h-3 w-3 text-emerald-500 shrink-0" />
                  <span className="truncate text-muted-foreground italic">"{replyingTo.content.slice(0, 40)}..."</span>
                </div>
                <button onClick={() => setReplyingTo(null)} className="ml-2 text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); sendQuery(input); }} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                placeholder="Ask about your finances..."
                className="flex-1 bg-muted/40 text-foreground placeholder-muted-foreground border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 disabled:opacity-50 transition-all"
              />
              {isLoading ? (
                <button type="button" onClick={() => { abortRef.current?.abort(); setIsLoading(false); }}
                  className="shrink-0 bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 h-9 w-9 rounded-xl flex items-center justify-center">
                  <PauseCircle className="h-4 w-4" />
                </button>
              ) : (
                <button type="submit" disabled={!input.trim()}
                  className="shrink-0 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/30 text-emerald-950 h-9 w-9 rounded-xl flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.25)] disabled:shadow-none hover:scale-105 active:scale-95 transition-all">
                  <Send className="h-3.5 w-3.5" />
                </button>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* ── Trigger button — top right, no ping animation ─────────── */}
      {/* Wrap icon in animated div */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={`
          fixed top-[74px] right-4 z-50 flex items-center gap-3 rounded-full
          px-4 py-2.5 text-sm font-medium tracking-wide
          border transition-all duration-300 active:scale-95
          ${isOpen
            ? "bg-card border-border text-foreground hover:bg-muted shadow-lg"
            : "bg-[#06150e]/80 backdrop-blur-md border-emerald-500/30 text-emerald-400 hover:bg-[#081c13] hover:border-emerald-500/60 hover:shadow-[0_0_24px_rgba(16,185,129,0.35)] shadow-md"
          }
        `}
      >
        <div className={`bot-wrap shrink-0 ${!isOpen ? "bot-hoverable" : ""}`}>
          <CustomBotIcon className="h-5 w-5" />
        </div>
        <span className="hidden sm:inline">
          {isOpen ? "Close Chat" : "FinanceNeo AI"}
        </span>
        {isOpen
          ? <ChevronUp className="h-4 w-4" />
          : <ChevronDown className="h-4 w-4" />
        }
        {!isOpen && aiCount > 0 && (
          <span className="h-4 w-4 rounded-full bg-emerald-500 text-emerald-950 text-[10px] font-bold flex items-center justify-center ml-1">
            {aiCount}
          </span>
        )}
      </button>
    </>
  );
}