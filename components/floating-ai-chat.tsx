"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, AlertCircle, PauseCircle, X, ChevronUp, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useChat, UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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

export function FloatingAiChat() {
  const router = useRouter();
  const userId = "user";
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const welcomeMessage: UIMessage[] = [
    {
      id: "welcome",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "Hello! I'm FinanceNeo AI. Ask me anything about your finances, or tell me to add a transaction or update your budgets!",
        }
      ],
    }
  ];

  const { messages = [], sendMessage, status, stop, error, regenerate, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    messages: welcomeMessage,
    onFinish: ({ message, finishReason }: any) => {
      try {
        const txt = getMessageText(message);
        const tools = hasToolInvocations(message);
        console.log('[FloatingAiChat] useChat.onFinish → status=' + status, 'role=' + message?.role, 'hasTools=' + tools, 'finishReason=' + (finishReason || '?') , 'text_len=' + (txt?.length || 0));
        if (!txt && !tools) {
          console.warn('[FloatingAiChat] ⚠ Empty assistant response! message=', message);
          toast.warning('AI response was empty. Retrying…', {
            description: 'Sometimes this happens if the AI service drops the stream. Pressing retry.',
            action: { label: 'Retry', onClick: () => regenerate?.() }
          });
        }
      } catch (e) {
        console.warn('[FloatingAiChat] onFinish threw:', e);
      }
    },
    onError: (err: Error) => {
      console.error('[FloatingAiChat] useChat.onError RAW ERROR: message=' + (err?.message || err), err?.stack || err, 'cause=', (err as any)?.cause);
      const userMsg = err?.message && err.message.length > 3
        ? err.message
        : 'Could not reach FinanceNeo AI. Please check your connection and try again.';
      toast.error('AI Request Failed', {
        description: userMsg,
        action: {
          label: 'Retry',
          onClick: () => { try { regenerate?.(); } catch (e) { console.error(e); } }
        },
        duration: 8000,
      });
    }
  });

  // Hydrate saved messages from localStorage AFTER initial render to prevent SSR hydration mismatch
  useEffect(() => {
    if (mounted && typeof window !== "undefined") {
      const saved = localStorage.getItem(`finance-neo-chat-${userId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        } catch (e) {}
      }
    }
  }, [userId, setMessages, mounted]);

  // Persist messages to localStorage
  useEffect(() => {
    if (mounted && messages.length > 0) {
      localStorage.setItem(`finance-neo-chat-${userId}`, JSON.stringify(messages));
    }
  }, [messages, userId, mounted]);

  const isLoading = status === 'streaming' || status === 'submitted';

  const [input, setInput] = useState("");

  const getMessageText = (m: any): string => {
    // Robust extraction across SDK formats (old content-string, new parts-array,
    // plus toolInvocations object and toolResult text fallbacks).
    const candidates: string[] = [];

    if (typeof m?.content === 'string' && m.content.trim().length > 0) {
      candidates.push(m.content);
    }
    if (m?.toolInvocations && Array.isArray(m.toolInvocations)) {
      for (const ti of m.toolInvocations) {
        if (ti?.result) {
          if (typeof ti.result === 'string') candidates.push(ti.result);
          else if (typeof ti.result === 'object' && ti.result !== null) {
            if (typeof (ti.result as any).message === 'string') candidates.push((ti.result as any).message);
            if (typeof (ti.result as any).error === 'string') candidates.push('⚠ ' + (ti.result as any).error);
          }
        }
      }
    }
    if (m?.parts && Array.isArray(m.parts)) {
      for (const p of m.parts) {
        if (typeof p === 'string') { if (p.trim()) candidates.push(p); continue; }
        if (!p || typeof p !== 'object') continue;
        if (typeof (p as any).text === 'string' && (p as any).text.trim()) candidates.push((p as any).text);
        if ((p as any).type === 'tool-result' && typeof (p as any).result === 'string' && (p as any).result.trim()) candidates.push((p as any).result);
        if ((p as any).type === 'tool-invocation' && typeof (p as any).toolName === 'string' && (p as any).args && typeof (p as any).args === 'object') {
          // Keep tool calls silent (we display them separately as Executing chip)
          // but if args is the ONLY content we're about to drop, include as debug.
        }
      }
    }
    // Fallback: stringify any remaining content
    const combined = candidates.filter(Boolean).join('\n\n').trim();
    if (combined) return combined;

    // Last-ditch: try JSON.stringify of known keys
    try {
      if (typeof m === 'object' && m !== null) {
        const last = (m as any).text || (m as any).message || '';
        if (typeof last === 'string') return last;
      }
    } catch {}
    return "";
  };

  const hasToolInvocations = (m: any): boolean => {
    if (m?.toolInvocations && Array.isArray(m.toolInvocations) && m.toolInvocations.length > 0) {
      return true;
    }
    if (m?.parts && Array.isArray(m.parts)) {
      return m.parts.some((p: any) =>
        p?.type && (p.type === 'dynamic-tool' || p.type.startsWith('tool-'))
      );
    }
    return false;
  };

  // Live update: when the AI invokes a tool, trigger a router.refresh() so
  // the BudgetProvider and TransactionsProvider pull in freshly-revalidated
  // server data (paths revalidated server-side by /api/chat via revalidatePath
  // inside each tool). Also refresh once more AFTER the response ends (status
  // returns to ready) so the totals in the page header update correctly.
  const lastMessage = messages[messages.length - 1];
  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (hasToolInvocations(lastMessage)) {
      router.refresh();
    }
  }, [lastMessage, router]);

  // On status transition (loading → ready/error): re-refresh. Server-side
  // revalidatePath runs DURING tool execution; by the time status flips back,
  // Next.js cache is guaranteed invalidated, so another refresh pulls the new
  // numbers. This is the critical timing for dashboard totals to update.
  useEffect(() => {
    const justFinished =
      prevStatusRef.current !== 'ready' &&
      (status === 'ready' || status === 'error');
    if (justFinished) {
      // Small debounce: server's revalidatePath propagates within a tick, but
      // a short delay avoids 409 on some Next.js edge runtimes.
      const id = setTimeout(() => router.refresh(), 150);
      return () => clearTimeout(id);
    }
    prevStatusRef.current = status;
  }, [status, router]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setTimeout(() => inputRef.current?.focus(), 320);
    }
  }, [isOpen]);

  // Sync the DOM input when input state is cleared by submit
  useEffect(() => {
    if (input === "" && inputRef.current) {
      inputRef.current.value = "";
    }
  }, [input]);

  const handleLocalSubmit = async (
    e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent,
    overrideText?: string
  ) => {
    if (e && e.preventDefault) e.preventDefault();
    const useText = (overrideText !== undefined ? overrideText : input).trim();
    if (!useText || isLoading) return;

    setInput("");
    console.log('[FloatingAiChat] handleLocalSubmit → text=' + JSON.stringify(useText.substring(0, 120)), 'prev_status=' + status);

    try {
      const promise = sendMessage({ text: useText });
      if (promise && typeof promise.catch === 'function') {
        // Handle rejected promise from sendMessage (transport failures)
        promise.catch((err: any) => {
          console.error('[FloatingAiChat] sendMessage promise REJECTED (transport-level):', err?.message || err, err?.stack || err);
          toast.error('Message failed to send', {
            description: err?.message || 'Could not reach the chat server. Please check your internet connection.',
            action: { label: 'Retry', onClick: () => handleLocalSubmit(undefined, useText) }
          });
        });
      }
      await promise;
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 50);
    } catch (err: any) {
      // Synchronous / caught throw
      console.error('[FloatingAiChat] sendMessage THROWN synchronously:', err?.message || err, err?.stack || err);
      toast.error('Message failed', { description: err?.message || 'Unexpected error sending message.' });
    }
  };

  // Whenever error state changes, additionally toast it — catches edge cases
  // where transport emits error via state setter but onError isn't invoked.
  useEffect(() => {
    if (error) {
      console.error('[FloatingAiChat] useEffect detected error state change:', error);
    }
  }, [error]);

  const parseMessage = (rawText: string = "") => {
    if (!rawText) return { cleanContent: "", suggestions: [] };
    let cleanContent = rawText;
    let suggestions: string[] = [];
    const si = rawText.indexOf("---SUGGESTIONS---");
    if (si !== -1) {
      cleanContent = rawText.substring(0, si).trim();
      suggestions = rawText.substring(si + 17).trim()
        .split("\n").map((s: string) => s.replace(/^[-*•\d.)]\s*/, "").trim())
        .filter((s: string) => s.length > 0).slice(0, 3);
    }
    return { cleanContent, suggestions };
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mounted && isOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setIsOpen(false)} />
      )}

      {/* Chat panel */}
      {mounted && (
        <div
          className="fixed z-50 w-[calc(100vw-2rem)] sm:w-[420px] left-4 right-4 sm:left-auto sm:right-6 transition-all duration-300 top-[4.5rem] sm:top-auto sm:bottom-[7.5rem] origin-top sm:origin-bottom-right"
          style={{
            transform: isOpen ? "translateY(0) scale(1)" : "translateY(-12px) scale(0.92)",
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? "auto" : "none",
            transition: isOpen
              ? "transform 0.32s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease"
              : "transform 0.2s cubic-bezier(0.4,0,1,1), opacity 0.15s ease",
          }}
        >
        <div
          className="flex flex-col rounded-3xl border border-white/10 bg-[#0B0F19]/98 backdrop-blur-3xl overflow-hidden shadow-[0_32px_128px_-16px_rgba(0,0,0,1)] ring-1 ring-white/10 h-[min(520px,calc(100dvh-160px))] sm:h-[min(600px,calc(100dvh-140px))]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 sm:px-5 sm:py-4 shrink-0 bg-gradient-to-r from-emerald-950/40 to-transparent">
            <div className="flex items-center gap-3">
              <div className="bot-chip p-1.5 sm:p-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                <CustomBotIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs sm:text-sm font-bold text-white leading-none">Chat with FinanceNeo</h2>
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 sm:p-2 rounded-xl text-muted-foreground hover:text-white hover:bg-white/5 transition-all active:scale-90"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 custom-scrollbar" tabIndex={0}>
            {(messages.length > 0 ? messages : [{
              id: "initial-fallback",
              role: "assistant",
              parts: [{
                type: 'text',
                text: "Hello! I'm FinanceNeo AI. Ask me anything about your finances, or tell me to add a transaction or update your budgets!"
              }]
            }]).map((m) => {
              const messageText = getMessageText(m);
              const isUser = m.role === "user";
              const { cleanContent, suggestions } = parseMessage(messageText);
              
              if (!cleanContent && !hasToolInvocations(m)) return null;

              const isExecutingOnly = !isUser && !cleanContent && hasToolInvocations(m);
              if (isExecutingOnly) {
                return (
                   <div key={m.id} className="flex w-full group justify-start">
                     <div className="flex max-w-[88%] gap-3 flex-row items-center">
                        <div className="bot-chip shrink-0 h-7 w-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                          <CustomBotIcon className="h-4 w-4" />
                        </div>
                        <div className="text-xs text-muted-foreground italic bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                           Executing action...
                        </div>
                     </div>
                   </div>
                );
              }

              return (
                <div key={m.id} className={`flex w-full group ${isUser ? "justify-end" : "justify-start"}`}>
                  <div className={`flex max-w-[90%] sm:max-w-[88%] gap-2 sm:gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} items-end`}>
                    {!isUser && (
                      <div className="bot-chip shrink-0 h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <CustomBotIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                      </div>
                    )}
                    <div className={`flex flex-col min-w-0 ${isUser ? "items-end" : "items-start"}`}>
                      <div className={`text-xs sm:text-sm break-words px-3 py-2 sm:px-4 sm:py-2.5 ${isUser
                        ? "bg-emerald-600 text-white rounded-2xl rounded-br-sm shadow-lg shadow-emerald-900/20"
                        : "bg-white/5 border border-white/5 text-slate-200 rounded-2xl rounded-bl-sm"
                        }`}>
                        {isUser ? (
                          <div className="leading-relaxed whitespace-pre-wrap">{cleanContent}</div>
                        ) : (
                          <div className="leading-relaxed">
                            <ReactMarkdown components={{
                              p: ({ node, ...props }) => <div className="mb-1.5 sm:mb-2 last:mb-0" {...props} />,
                              ul: ({ node, ...props }) => <ul className="list-disc pl-3 sm:pl-4 mb-2 space-y-0.5 sm:space-y-1 marker:text-emerald-500" {...props} />,
                              ol: ({ node, ...props }) => <ol className="list-decimal pl-3 sm:pl-4 mb-2 space-y-0.5 sm:space-y-1 marker:text-emerald-500" {...props} />,
                              li: ({ node, ...props }) => <li className="pl-0.5 sm:pl-1" {...props} />,
                              strong: ({ node, ...props }) => <strong className="text-emerald-400 font-bold" {...props} />,
                            }}>
                              {cleanContent}
                            </ReactMarkdown>
                            {suggestions && suggestions.length > 0 && (
                              <div className="mt-2.5 pt-2.5 border-t border-white/5 flex flex-col gap-1 sm:gap-1.5">
                                {suggestions.map((sug, idx) => (
                                  <button key={idx} onClick={() => sendMessage({ text: sug })}
                                    className="text-[10px] sm:text-[11px] bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 text-slate-300 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl transition-all text-left flex items-center gap-1.5 sm:gap-2">
                                    <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 text-emerald-500" />{sug}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Show "Executing action..." chip inline below the assistant's pre-brief text.
                          This ensures the pre-brief text ("Setting overall budget to ₹40,000...") never
                          disappears or gets "wiped out" even after tool-invocation parts arrive. */}
                      {!isUser && hasToolInvocations(m) && (
                        <div className="mt-1.5 flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground italic bg-white/5 px-2.5 py-1 rounded-xl border border-white/5">
                           <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                           Executing action...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="flex gap-2 sm:gap-3 items-end">
                  <div className="bot-chip h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <CustomBotIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
                  <div className="flex items-center gap-1 sm:gap-1.5 bg-white/5 border border-white/5 rounded-2xl rounded-bl-sm px-3 py-2 sm:px-4 sm:py-3">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-emerald-500/70 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-white/5 bg-[#0D1117]/90 px-3 py-3 sm:px-4 sm:py-4">
            {error && (
              <div className="mb-2.5 text-[10px] sm:text-[11px] bg-red-500/10 border border-red-500/20 text-red-400 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl flex items-center gap-2">
                <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                <span className="flex-1 truncate">{error.message || "Connection failed."}</span>
              </div>
            )}
            <form onSubmit={handleLocalSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                placeholder="Ask Neo about your finances..."
                className="flex-1 bg-white/5 text-white placeholder-muted-foreground border border-white/5 rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 disabled:opacity-50 transition-all"
              />
              {isLoading ? (
                <button type="button" onClick={async () => { try { await stop(); } catch (e) { console.error("Chat stop error:", e); } }}
                  className="shrink-0 bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 h-9 w-9 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl flex items-center justify-center">
                  <PauseCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              ) : (
                <button type="submit" disabled={!input.trim()}
                  className="shrink-0 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/30 text-emerald-950 h-9 w-9 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-[0_8px_16px_rgba(16,185,129,0.25)] disabled:shadow-none hover:scale-105 active:scale-95 transition-all">
                  <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
      )}

      {/* Trigger button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        suppressHydrationWarning
        className={`
          fixed z-50 flex items-center gap-1.5 sm:gap-2 rounded-full
          px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium tracking-wide
          border transition-all duration-300 active:scale-95
          top-2.5 right-2.5 sm:top-auto sm:bottom-10 sm:right-6
          bg-[#06150e]/90 backdrop-blur-md border-emerald-500/40 text-emerald-400
          hover:bg-[#081c13] hover:border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.25)]
          ${mounted && isOpen ? "opacity-0 pointer-events-none scale-90" : ""}
        `}
      >
        <span className="font-semibold flex items-center gap-1.5 text-[11px] sm:text-sm">
          <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />
          <span>Try AI</span>
          <span className="hidden sm:inline"> Chat</span>
        </span>
        {mounted && (
          <span className="hidden sm:inline-flex items-center">
            {isOpen
              ? <ChevronUp className="h-4 w-4" />
              : <ChevronDown className="h-4 w-4" />
            }
          </span>
        )}
        {mounted && !isOpen && unreadCount > 0 && (
          <span className="h-4 w-4 rounded-full bg-emerald-500 text-emerald-950 text-[10px] font-bold flex items-center justify-center ml-0.5">
            {unreadCount}
          </span>
        )}
      </button>
    </>
  );
}