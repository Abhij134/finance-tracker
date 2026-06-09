"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ScanStatus = "idle" | "extracting" | "analyzing" | "success" | "error";

interface ScanState {
    status: ScanStatus;
    progress: number;
    statusText: string;
    totalChunks: number;
    currentChunk: number;
    extractedCount: number;
    recentMerchants: string[];
}

export interface ExtractedTransaction {
    date: string;
    description: string;
    amount: number;
    type: "credit" | "debit";
    category?: string;
    page?: number;
    referenceId?: string | null;
}

export type ExtractScanState = "idle" | "scanning" | "paused" | "stopped" | "done" | "error";

interface ExtractState {
    scanState: ExtractScanState;
    progress: number;
    message: string;
    currentPage: number;
    totalPages: number;
    transactions: ExtractedTransaction[];
    error: string | null;
    isScanning: boolean;
    isPaused: boolean;
    isStopped: boolean;
    isDone: boolean;
    isError: boolean;
}

interface ScanContextType {
    // ── Legacy ScanContext (old chunk-based path) ──────────────────────────────
    scanState: ScanState;
    startScan: (chunks: string[], onChunk?: (txs: any[]) => void) => void;
    cancelScan: () => void;
    isScanning: boolean;
    setExternalScanState?: React.Dispatch<React.SetStateAction<ScanState>>;
    resetExternalScanState?: () => void;

    // ── Global Extract State (new streaming path — survives navigation) ────────
    extract: ExtractState;
    extractPDF: (file: File) => Promise<void>;
    extractImage: (base64: string) => Promise<void>;
    pauseExtract: () => void;
    resumeExtract: () => void;
    stopExtract: () => void;
    resetExtract: () => void;
    onTransactionsReady: (cb: (txs: ExtractedTransaction[]) => void) => void;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const defaultScanState: ScanState = {
    status: "idle",
    progress: 0,
    statusText: "",
    totalChunks: 0,
    currentChunk: 0,
    extractedCount: 0,
    recentMerchants: [],
};

const defaultExtractState: ExtractState = {
    scanState: "idle",
    progress: 0,
    message: "",
    currentPage: 0,
    totalPages: 0,
    transactions: [],
    error: null,
    isScanning: false,
    isPaused: false,
    isStopped: false,
    isDone: false,
    isError: false,
};

const ScanContext = createContext<ScanContextType>({
    scanState: defaultScanState,
    startScan: () => { },
    cancelScan: () => { },
    isScanning: false,
    setExternalScanState: () => { },
    resetExternalScanState: () => { },
    extract: defaultExtractState,
    extractPDF: async () => { },
    extractImage: async () => { },
    pauseExtract: () => { },
    resumeExtract: () => { },
    stopExtract: () => { },
    resetExtract: () => { },
    onTransactionsReady: () => { },
});

export const useScanContext = () => useContext(ScanContext);

// ─── Session helpers (legacy) ─────────────────────────────────────────────────

const SESSION_KEY = "financeneo_scan_state";

function saveToSession(state: ScanState, pendingChunks: string[]) {
    if (typeof window !== "undefined") {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ state, pendingChunks }));
    }
}

function loadFromSession(): { state: ScanState; pendingChunks: string[] } | null {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}

function clearSession() {
    if (typeof window !== "undefined") sessionStorage.removeItem(SESSION_KEY);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ScanProvider({ children }: { children: React.ReactNode }) {

    // ══ Legacy chunk-based state ══════════════════════════════════════════════
    const [scanState, setScanState] = useState<ScanState>(defaultScanState);
    const processingRef = useRef(false);
    const abortRef = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const chunksRef = useRef<string[]>([]);

    const processChunksSequentially = useCallback(async (chunks: string[], onChunk?: (txs: any[]) => void) => {
        if (processingRef.current) return;
        processingRef.current = true;

        let allExtracted = 0;
        let runningMerchants: string[] = [];
        const PAGES_PER_CHUNK = 10;
        let index = 0;

        for (const chunk of chunks) {
            if (abortRef.current) break;

            const chunkNum = index + 1;

            if (index > 0 && index % 14 === 0) {
                const COOLDOWN_STEPS = 60;
                for (let s = COOLDOWN_STEPS; s > 0; s--) {
                    if (abortRef.current) break;
                    setScanState(prev => ({ ...prev, statusText: `Cooling down API for ${s}s...` }));
                    await new Promise(r => setTimeout(r, 1000));
                }
                if (abortRef.current) break;
            }

            const startPage = index * PAGES_PER_CHUNK + 1;
            const endPage = Math.min((index + 1) * PAGES_PER_CHUNK, chunks.length * PAGES_PER_CHUNK);
            const progressPct = Math.round((chunkNum / chunks.length) * 80) + 10;

            setScanState(prev => ({
                ...prev, status: "analyzing", progress: progressPct,
                statusText: `Scanning pages ${startPage}-${endPage}...`,
                totalChunks: chunks.length, currentChunk: chunkNum,
            }));

            try {
                const response = await fetch("/api/scan", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ textChunk: chunk }),
                    signal: abortControllerRef.current?.signal,
                });

                const result = await response.json();
                if (abortRef.current) break;

                if (result.success && result.transactions) {
                    allExtracted += (result.count || 0);
                    const newMerchants = result.transactions
                        .filter((tx: any) => tx.merchant && tx.merchant !== "Unknown")
                        .map((tx: any) => tx.merchant);
                    if (newMerchants.length > 0) {
                        runningMerchants = Array.from(new Set([...runningMerchants, ...newMerchants])).slice(-5);
                    }
                    setScanState(prev => ({ ...prev, extractedCount: allExtracted, recentMerchants: runningMerchants }));
                    if (onChunk && result.transactions.length > 0) onChunk(result.transactions);
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            } catch (err: any) {
                if (err.name === "AbortError") break;
                console.error(`[ScanContext] chunk ${chunkNum} error:`, err);
            }

            if (abortRef.current) break;
            index++;
        }

        const finalizedStatus = abortRef.current ? "idle" : "success";
        const finalMessage = abortRef.current
            ? `Stopped. ${allExtracted} transactions imported.`
            : `Complete! ${allExtracted} transactions imported.`;

        setScanState(prev => ({ ...prev, status: finalizedStatus, progress: 100, statusText: finalMessage }));
        clearSession();
        processingRef.current = false;
        setTimeout(() => {
            if (!processingRef.current) {
                setScanState(defaultScanState);
                abortRef.current = false;
                abortControllerRef.current = null;
            }
        }, 5000);
    }, []);

    const startScan = useCallback((chunks: string[], onChunk?: (txs: any[]) => void) => {
        abortRef.current = false;
        abortControllerRef.current = new AbortController();
        if (processingRef.current) { console.warn("Scan already in progress"); return; }
        chunksRef.current = chunks;
        processChunksSequentially(chunks, onChunk);
    }, [processChunksSequentially]);

    const cancelScan = useCallback(() => {
        abortRef.current = true;
        try { abortControllerRef.current?.abort(); } catch { /* ignore */ }
        setScanState(prev => ({ ...prev, status: "idle", statusText: `Stopped. ${prev.extractedCount} saved.`, progress: 0 }));
        processingRef.current = false;
    }, []);

    const resetExternalScanState = useCallback(() => setScanState(defaultScanState), []);

    // ══ Global streaming extract state (survives navigation) ═════════════════

    const [extractState, setExtractState] = useState<ExtractState>(defaultExtractState);

    // Stable refs — these NEVER get garbage collected on navigation
    const extractAbortCtrlRef = useRef<AbortController | null>(null);
    const extractReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
    const extractIsPausedRef = useRef(false);
    const extractTxBufferRef = useRef<ExtractedTransaction[]>([]);
    const extractTxCountRef = useRef(0);
    const extractProgressBufferRef = useRef<{ progress?: number; message?: string; currentPage?: number; totalPages?: number; }>({});
    const extractScanStateRef = useRef<ExtractScanState>("idle");

    // Callback registered by the page that's currently mounted — called when scan finishes
    const txReadyCallbackRef = useRef<((txs: ExtractedTransaction[]) => void) | null>(null);

    const onTransactionsReady = useCallback((cb: (txs: ExtractedTransaction[]) => void) => {
        txReadyCallbackRef.current = cb;
    }, []);

    const updateExtractScanState = useCallback((s: ExtractScanState) => {
        extractScanStateRef.current = s;
        setExtractState(prev => ({
            ...prev,
            scanState: s,
            isScanning: s === "scanning",
            isPaused: s === "paused",
            isStopped: s === "stopped",
            isDone: s === "done",
            isError: s === "error",
        }));
    }, []);

    const stopExtract = useCallback(() => {
        extractIsPausedRef.current = false;
        try { extractAbortCtrlRef.current?.abort("user_stopped"); } catch { /* ignore */ }
        try { extractReaderRef.current?.cancel("user_stopped").catch(() => { }); } catch { /* ignore */ }
        updateExtractScanState("stopped");
        setExtractState(prev => ({ ...prev, message: `Stopped — ${extractTxCountRef.current} transactions saved` }));
    }, [updateExtractScanState]);

    const pauseExtract = useCallback(() => {
        extractIsPausedRef.current = true;
        updateExtractScanState("paused");
        setExtractState(prev => ({ ...prev, message: "Paused — press Resume to continue" }));
    }, [updateExtractScanState]);

    const resumeExtract = useCallback(() => {
        extractIsPausedRef.current = false;
        updateExtractScanState("scanning");
        setExtractState(prev => {
            const buf = extractProgressBufferRef.current;
            const newTxs = extractTxBufferRef.current.length > 0
                ? [...prev.transactions, ...extractTxBufferRef.current]
                : prev.transactions;
            extractTxCountRef.current += extractTxBufferRef.current.length;
            extractTxBufferRef.current = [];
            extractProgressBufferRef.current = {};
            return {
                ...prev,
                progress: buf.progress ?? prev.progress,
                message: buf.message ?? "Resuming...",
                currentPage: buf.currentPage ?? prev.currentPage,
                totalPages: buf.totalPages ?? prev.totalPages,
                transactions: newTxs,
            };
        });
    }, [updateExtractScanState]);

    const resetExtract = useCallback(() => {
        try { extractAbortCtrlRef.current?.abort(); } catch { /* ignore */ }
        extractIsPausedRef.current = false;
        extractTxBufferRef.current = [];
        extractTxCountRef.current = 0;
        extractProgressBufferRef.current = {};
        extractScanStateRef.current = "idle";
        setExtractState(defaultExtractState);
    }, []);

    const streamExtract = useCallback(async (formData: FormData) => {
        const ctrl = new AbortController();
        extractAbortCtrlRef.current = ctrl;
        extractIsPausedRef.current = false;
        extractTxBufferRef.current = [];
        extractTxCountRef.current = 0;
        extractProgressBufferRef.current = {};

        updateExtractScanState("scanning");
        setExtractState({
            scanState: "scanning",
            progress: 0,
            message: "Starting...",
            currentPage: 0,
            totalPages: 0,
            transactions: [],
            error: null,
            isScanning: true,
            isPaused: false,
            isStopped: false,
            isDone: false,
            isError: false,
        });

        try {
            const res = await fetch("/api/extract", {
                method: "POST",
                body: formData,
                signal: ctrl.signal,
            });

            if (!res.ok) {
                const text = await res.text().catch(() => res.statusText);
                throw new Error(`Server error ${res.status}: ${text}`);
            }
            if (!res.body) throw new Error("No response body");

            const reader = res.body.getReader();
            extractReaderRef.current = reader;
            const decoder = new TextDecoder();
            let lineBuffer = "";

            while (true) {
                if (ctrl.signal.aborted) break;

                const { done, value } = await reader.read();
                if (done) break;

                lineBuffer += decoder.decode(value, { stream: true });
                const lines = lineBuffer.split("\n");
                lineBuffer = lines.pop() ?? "";

                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    try {
                        const data = JSON.parse(line.slice(6));

                        if (data.type === "progress") {
                            if (extractIsPausedRef.current) {
                                if (data.percent != null) extractProgressBufferRef.current.progress = data.percent;
                                if (data.message != null) extractProgressBufferRef.current.message = data.message;
                                if (data.currentPage != null) extractProgressBufferRef.current.currentPage = data.currentPage;
                                if (data.totalPages != null) extractProgressBufferRef.current.totalPages = data.totalPages;
                            } else {
                                setExtractState(prev => ({
                                    ...prev,
                                    progress: data.percent ?? prev.progress,
                                    message: data.message ?? prev.message,
                                    currentPage: data.currentPage ?? prev.currentPage,
                                    totalPages: data.totalPages ?? prev.totalPages,
                                }));
                            }

                        } else if (data.type === "transaction") {
                            const tx = data.transaction as ExtractedTransaction;
                            if (extractIsPausedRef.current) {
                                extractTxBufferRef.current.push(tx);
                            } else {
                                extractTxCountRef.current += 1;
                                setExtractState(prev => ({ ...prev, transactions: [...prev.transactions, tx] }));
                            }

                        } else if (data.type === "done") {
                            const finalTxs = (data.transactions ?? []) as ExtractedTransaction[];
                            extractTxCountRef.current = finalTxs.length;
                            updateExtractScanState("done");
                            setExtractState(prev => ({
                                ...prev,
                                transactions: finalTxs,
                                progress: 100,
                                message: `Complete — ${finalTxs.length} transactions found`,
                                scanState: "done",
                                isScanning: false,
                                isDone: true,
                            }));
                            // Fire the callback if a page registered one
                            txReadyCallbackRef.current?.(finalTxs);

                        } else if (data.type === "aborted") {
                            updateExtractScanState("stopped");
                            setExtractState(prev => ({
                                ...prev,
                                message: `Stopped — ${extractTxCountRef.current} transactions saved`,
                            }));

                        } else if (data.type === "error") {
                            setExtractState(prev => ({ ...prev, error: data.message }));
                            updateExtractScanState("error");
                        }
                    } catch { /* skip malformed SSE line */ }
                }
            }
        } catch (err: any) {
            if (err.name === "AbortError" || ctrl.signal.aborted) {
                updateExtractScanState("stopped");
                setExtractState(prev => ({
                    ...prev,
                    message: `Stopped — ${extractTxCountRef.current} transactions saved`,
                }));
            } else {
                console.error("[ScanContext/extract] error:", err);
                setExtractState(prev => ({ ...prev, error: err.message ?? "Unknown error" }));
                updateExtractScanState("error");
            }
        } finally {
            extractReaderRef.current = null;
        }
    }, [updateExtractScanState]);

    const extractPDF = useCallback(async (file: File) => {
        const fd = new FormData();
        fd.append("file", file);
        await streamExtract(fd);
    }, [streamExtract]);

    const extractImage = useCallback(async (base64: string) => {
        const fd = new FormData();
        fd.append("image", base64);
        await streamExtract(fd);
    }, [streamExtract]);

    // ──────────────────────────────────────────────────────────────────────────

    return (
        <ScanContext.Provider value={{
            // Legacy
            scanState,
            startScan,
            cancelScan,
            isScanning: scanState.status === "analyzing" || scanState.status === "extracting",
            setExternalScanState: setScanState,
            resetExternalScanState,
            // Global extract
            extract: extractState,
            extractPDF,
            extractImage,
            pauseExtract,
            resumeExtract,
            stopExtract,
            resetExtract,
            onTransactionsReady,
        }}>
            {children}
        </ScanContext.Provider>
    );
}
