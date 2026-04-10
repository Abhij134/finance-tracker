"use client";

import { useEffect, useState } from "react";

interface LiveTransaction {
    description: string;
    amount: number;
    type: "credit" | "debit";
    page?: number;
}

interface Props {
    isOpen: boolean;
    progress: number;
    message: string;
    currentPage: number;
    totalPages: number;
    txFound: number;
    recentTransactions: LiveTransaction[];
    error?: string | null;
    isStopped?: boolean;
    mode?: "pdf" | "image";
    onStop: () => void;
}

export function PDFExtractProgress({
    isOpen, progress, message, currentPage, totalPages,
    txFound, recentTransactions, error, isStopped, mode = "pdf", onStop,
}: Props) {
    const [dots, setDots] = useState("");
    const eta = totalPages > 0
        ? Math.max(0, Math.round((totalPages - currentPage) * 0.18))
        : null;

    useEffect(() => {
        if (!isOpen || progress === 100 || isStopped) return;
        const t = setInterval(() => setDots(d => d.length >= 3 ? "" : d + "."), 400);
        return () => clearInterval(t);
    }, [isOpen, progress, isStopped]);

    if (!isOpen) return null;

    const isDone = progress === 100;
    const fmtAmount = (amount: number, type: string) => {
        const prefix = type === "credit" ? "+" : "-";
        return `${prefix}₹${Math.abs(amount).toLocaleString("en-IN")}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[#0d1120] border border-[#1a2035] rounded-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-[#0f1628]">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        {isDone ? (
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M3 8l3.5 3.5L13 4.5" stroke="#4ecca3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        ) : isStopped ? (
                            <div className="w-3 h-3 rounded-sm bg-red-400" />
                        ) : (
                            <div className="w-4 h-4 border-2 border-emerald-900 border-t-emerald-400 rounded-full animate-spin" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                            {error
                                ? "Extraction failed"
                                : isStopped
                                    ? `Stopped — ${txFound} transactions saved`
                                    : isDone
                                        ? `Done — ${txFound} transactions found!`
                                        : mode === "pdf"
                                            ? `Scanning page ${currentPage} of ${totalPages}${dots}`
                                            : `Scanning image${dots}`
                            }
                        </p>
                        <p className="text-xs text-[#3a4565] mt-0.5 font-light truncate">{error ?? message}</p>
                    </div>
                    {!isDone && !isStopped && !error && (
                        <button
                            onClick={onStop}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-900/50 bg-red-950/50 text-red-400 text-xs font-medium hover:bg-red-950 hover:border-red-500/40 transition-all active:scale-95 flex-shrink-0"
                        >
                            <div className="w-2 h-2 rounded-sm bg-red-400 flex-shrink-0" />
                            Stop
                        </button>
                    )}
                </div>

                {/* Progress bar + page counter */}
                {!error && (
                    <div className="px-5 py-3 border-b border-[#0f1628]">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-[#3a4565]">Progress</span>
                            <span className="text-xs font-semibold text-emerald-400 tabular-nums">
                                {mode === "pdf" && totalPages > 0
                                    ? `${currentPage} / ${totalPages} pages`
                                    : `${progress}%`
                                }
                            </span>
                        </div>
                        <div className="h-1 bg-[#0a1020] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Stats row */}
                {!error && (
                    <div className="grid grid-cols-3 divide-x divide-[#0f1628] border-b border-[#0f1628]">
                        {[
                            { val: txFound.toString(), label: "Found" },
                            { val: mode === "pdf" ? currentPage.toString() : "—", label: "Page" },
                            { val: eta !== null ? `~${eta}s` : "—", label: "Remaining" },
                        ].map(({ val, label }) => (
                            <div key={label} className="px-4 py-3">
                                <div className={`text-lg font-semibold tabular-nums ${label === "Found" ? "text-emerald-400" : "text-white"}`}>
                                    {val}
                                </div>
                                <div className="text-[10px] text-[#2a3050] uppercase tracking-widest mt-0.5">{label}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Live transaction feed */}
                {!error && (
                    <div className="px-5 py-3">
                        <p className="text-[10px] text-[#2a3050] uppercase tracking-widest mb-2">Live feed</p>
                        <div className="flex flex-col gap-1.5 max-h-44 overflow-hidden">
                            {recentTransactions.slice(-5).reverse().map((tx, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-[#111827] bg-[#080d18]"
                                    style={{ animation: i === 0 ? "slideInFeed 0.3s ease" : undefined }}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tx.type === "credit" ? "bg-emerald-400" : "bg-red-400"}`} />
                                    <span className="flex-1 text-xs text-slate-400 font-light truncate">{tx.description}</span>
                                    <span className={`text-xs font-medium tabular-nums ${tx.type === "credit" ? "text-emerald-400" : "text-red-400"}`}>
                                        {fmtAmount(tx.amount, tx.type)}
                                    </span>
                                    {tx.page && (
                                        <span className="text-[10px] text-[#2a3050] bg-[#0a1020] px-1.5 py-0.5 rounded border border-[#111827]">
                                            p{tx.page}
                                        </span>
                                    )}
                                </div>
                            ))}
                            {recentTransactions.length === 0 && !isStopped && (
                                <div className="flex items-center gap-2 px-3 py-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                    <span className="text-xs text-[#3a4565] animate-pulse">Waiting for first results...</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="px-5 py-2.5 border-t border-[#0f1628] flex justify-between items-center">
                    <span className="text-[11px] text-[#1e2540]">
                        {mode === "pdf" ? "Mistral OCR · parallel chunks" : "Groq LLaMA Vision"}
                    </span>
                    {isDone && (
                        <span className="text-[11px] text-emerald-400 font-medium">Extraction complete</span>
                    )}
                </div>

            </div>
            <style>{`@keyframes slideInFeed{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>
        </div>
    );
}
