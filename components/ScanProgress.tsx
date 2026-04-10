"use client";

import { useEffect, useState, useRef } from "react";
import { X } from "lucide-react";

interface LiveTransaction {
    description: string;
    amount: number;
    type: "credit" | "debit";
    page?: number;
}

interface Props {
    isVisible: boolean;
    scanState: "idle" | "scanning" | "paused" | "stopped" | "done" | "error";
    progress: number;
    message: string;
    currentPage: number;
    totalPages: number;
    transactions: LiveTransaction[];
    error?: string | null;
    mode?: "pdf" | "image";
    onStop: () => void;
    onPause: () => void;
    onResume: () => void;
    onReset: () => void;
    onClose?: () => void;
}

export function ScanProgress({
    isVisible, scanState, progress, message,
    currentPage, totalPages, transactions,
    error, mode = "pdf",
    onStop, onPause, onResume, onReset, onClose,
}: Props) {
    const [dots, setDots] = useState("");
    const feedRef = useRef<HTMLDivElement>(null);
    const isActive = scanState === "scanning" || scanState === "paused";
    const isDone = scanState === "done";
    const isStopped = scanState === "stopped";
    const isPaused = scanState === "paused";
    const isError = scanState === "error";

    const eta = totalPages > 0 && currentPage > 0
        ? Math.max(0, Math.round((totalPages - currentPage) * 0.2))
        : null;

    useEffect(() => {
        if (scanState !== "scanning") return;
        const t = setInterval(() => setDots(d => d.length >= 3 ? "" : d + "."), 450);
        return () => clearInterval(t);
    }, [scanState]);

    useEffect(() => {
        if (feedRef.current) {
            feedRef.current.scrollTop = feedRef.current.scrollHeight;
        }
    }, [transactions.length]);

    if (!isVisible) return null;

    const fmt = (amount: number, type: string) => {
        const prefix = type === "credit" ? "+" : "-";
        return `${prefix}₹${Math.abs(amount).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
    };

    const headerText = () => {
        if (isError) return "Extraction failed";
        if (isStopped) return `Stopped — ${transactions.length} transactions saved`;
        if (isDone) return `Done! ${transactions.length} transactions found`;
        if (isPaused) return `Paused at page ${currentPage}`;
        if (mode === "pdf") return `Scanning page ${currentPage || "—"} of ${totalPages || "—"}${dots}`;
        return `Scanning image${dots}`;
    };

    return (
        <div className="w-full rounded-2xl border border-border bg-card overflow-hidden">

            {/* ── Header ── */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <div className={`
          w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0
          ${isError ? "bg-red-500/10 border border-red-500/20"
                        : isDone ? "bg-emerald-500/10 border border-emerald-500/20"
                            : isStopped ? "bg-red-500/10 border border-red-500/20"
                                : isPaused ? "bg-amber-500/10 border border-amber-500/20"
                                    : "bg-emerald-500/10 border border-emerald-500/20"}
        `}>
                    {isDone ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2.5 7l3 3 6-6" stroke="#4ecca3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    ) : isStopped || isError ? (
                        <div className="w-3 h-3 rounded-sm bg-red-400" />
                    ) : isPaused ? (
                        <div className="flex gap-0.5">
                            <div className="w-1 h-3 rounded-sm bg-amber-400" />
                            <div className="w-1 h-3 rounded-sm bg-amber-400" />
                        </div>
                    ) : (
                        <div className="w-3.5 h-3.5 border-2 border-emerald-900 border-t-emerald-400 rounded-full animate-spin" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground leading-tight truncate">
                        {headerText()}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate font-light">
                        {error ?? message}
                    </p>
                </div>

                {/* Control buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {(isActive) && (
                        <>
                            {isPaused ? (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onResume(); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-900/50 bg-emerald-950/30 text-emerald-400 text-[11px] font-medium hover:bg-emerald-950/60 transition-all active:scale-95"
                                >
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                                        <path d="M3 2l6 3-6 3V2z" />
                                    </svg>
                                    Resume
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onPause(); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-900/50 bg-amber-950/30 text-amber-400 text-[11px] font-medium hover:bg-amber-950/60 transition-all active:scale-95"
                                >
                                    <div className="flex gap-0.5">
                                        <div className="w-0.5 h-2.5 rounded-sm bg-amber-400" />
                                        <div className="w-0.5 h-2.5 rounded-sm bg-amber-400" />
                                    </div>
                                    Pause
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onStop(); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-900/50 bg-red-950/30 text-red-400 text-[11px] font-medium hover:bg-red-950/60 transition-all active:scale-95"
                            >
                                <div className="w-2 h-2 rounded-sm bg-red-400" />
                                Stop
                            </button>
                        </>
                    )}
                    {(isDone || isStopped || isError) && (
                        <div className="flex items-center gap-2">
                            {onClose && (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                                    className="p-1.5 rounded-lg border border-border bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all active:scale-95 flex items-center justify-center"
                                    title="Close"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Progress bar ── */}
            {!isError && (
                <div className="px-4 py-2.5 border-b border-border">
                    <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                            {mode === "pdf" ? "Pages scanned" : "Progress"}
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-400 tabular-nums">
                            {mode === "pdf" && totalPages > 0
                                ? `${currentPage} / ${totalPages}`
                                : `${Math.round(progress)}%`
                            }
                        </span>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${isPaused ? "bg-amber-500" : "bg-gradient-to-r from-emerald-500 to-teal-400"}`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* ── Stats ── */}
            {!isError && (
                <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
                    {[
                        {
                            val: transactions.length.toString(),
                            label: "Found",
                            color: "text-emerald-400",
                        },
                        {
                            val: mode === "pdf" ? (currentPage > 0 ? currentPage.toString() : "—") : "—",
                            label: "Page",
                            color: "text-foreground",
                        },
                        {
                            val: eta !== null ? `~${eta}s` : isDone ? "0s" : "—",
                            label: "Remaining",
                            color: "text-foreground",
                        },
                    ].map(({ val, label, color }) => (
                        <div key={label} className="px-3 py-2.5">
                            <div className={`text-base font-semibold tabular-nums ${color}`}>{val}</div>
                            <div className="text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">{label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Live feed ── */}
            {!isError && (
                <div className="px-4 py-2.5">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-2">
                        {isPaused ? "Paused — buffering transactions" : "Live feed"}
                    </p>
                    <div ref={feedRef} className="flex flex-col gap-1 max-h-36 overflow-y-auto scrollbar-none">
                        {transactions.length === 0 ? (
                            <div className="flex items-center gap-2 py-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${isDone || isStopped ? "bg-muted-foreground/30" : "bg-amber-400 animate-pulse"}`} />
                                <span className={`text-[11px] ${isDone || isStopped ? "text-muted-foreground" : "text-muted-foreground animate-pulse"}`}>
                                    {isDone || isStopped ? "No transactions found" : "Waiting for results..."}
                                </span>
                            </div>
                        ) : (
                            [...transactions].reverse().slice(0, 8).map((tx, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-muted/40"
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tx.type === "credit" ? "bg-emerald-400" : "bg-red-400"}`} />
                                    <span className="flex-1 text-[11px] text-muted-foreground font-light truncate">{tx.description}</span>
                                    <span className={`text-[11px] font-medium tabular-nums flex-shrink-0 ${tx.type === "credit" ? "text-emerald-400" : "text-red-400"}`}>
                                        {fmt(tx.amount, tx.type)}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* ── Footer ── */}
            {isPaused && (
                <div className="px-4 py-2 border-t border-border flex justify-end items-center">
                    <span className="text-[10px] text-amber-500/70">
                        {transactions.length} saved · tap Resume to continue
                    </span>
                </div>
            )}
        </div>
    );
}
