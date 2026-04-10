"use client";

import { useState, useRef, useCallback } from "react";

export interface ExtractedTransaction {
    date: string;
    description: string;
    amount: number;
    type: "credit" | "debit";
    category?: string;
    page?: number;
    referenceId?: string | null;
}

export type ScanState = "idle" | "scanning" | "paused" | "stopped" | "done" | "error";

export function useExtract() {
    const [scanState, setScanState] = useState<ScanState>("idle");
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState("");
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [transactions, setTransactions] = useState<ExtractedTransaction[]>([]);
    const [error, setError] = useState<string | null>(null);

    // These refs survive re-renders and are accessible from button clicks immediately
    const abortCtrlRef = useRef<AbortController | null>(null);
    const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
    const isPausedRef = useRef(false);
    const txBufferRef = useRef<ExtractedTransaction[]>([]);
    const txCountRef = useRef(0);
    const progressBufferRef = useRef<{
        progress?: number;
        message?: string;
        currentPage?: number;
        totalPages?: number;
    }>({});
    const scanStateRef = useRef<ScanState>("idle");

    // Keep ref in sync with state
    const updateScanState = (s: ScanState) => {
        scanStateRef.current = s;
        setScanState(s);
    };

    const stop = useCallback(() => {
        console.log("[useExtract] STOP called — aborting fetch");
        isPausedRef.current = false;
        // Abort the fetch — this cancels the HTTP request server-side too
        try { abortCtrlRef.current?.abort("user_stopped"); } catch { /* ignore */ }
        // Cancel the stream reader
        try { readerRef.current?.cancel("user_stopped").catch(() => { }); } catch { /* ignore */ }
        updateScanState("stopped");
        setMessage(`Stopped — ${txCountRef.current} transactions saved`);
    }, []);

    const pause = useCallback(() => {
        console.log("[useExtract] PAUSE called");
        isPausedRef.current = true;
        updateScanState("paused");
        setMessage("Paused — press Resume to continue");
    }, []);

    const resume = useCallback(() => {
        console.log("[useExtract] RESUME called");
        isPausedRef.current = false;
        updateScanState("scanning");

        // Flush buffered progress
        if (progressBufferRef.current.progress != null) setProgress(progressBufferRef.current.progress);
        if (progressBufferRef.current.currentPage != null) setCurrentPage(progressBufferRef.current.currentPage);
        if (progressBufferRef.current.totalPages != null) setTotalPages(progressBufferRef.current.totalPages);

        // Flush buffered transactions that arrived while paused
        if (txBufferRef.current.length > 0) {
            setTransactions(prev => [...prev, ...txBufferRef.current]);
            txCountRef.current += txBufferRef.current.length;
            txBufferRef.current = [];
        }
        setMessage(progressBufferRef.current.message ?? "Resuming...");
        progressBufferRef.current = {};
    }, []);

    const reset = useCallback(() => {
        try { abortCtrlRef.current?.abort(); } catch { /* ignore */ }
        isPausedRef.current = false;
        txBufferRef.current = [];
        txCountRef.current = 0;
        updateScanState("idle");
        setProgress(0);
        setMessage("");
        setCurrentPage(0);
        setTotalPages(0);
        setTransactions([]);
        setError(null);
    }, []);

    const streamExtract = useCallback(async (formData: FormData) => {
        // Fresh abort controller for each scan
        const ctrl = new AbortController();
        abortCtrlRef.current = ctrl;
        isPausedRef.current = false;
        txBufferRef.current = [];
        txCountRef.current = 0;

        updateScanState("scanning");
        setProgress(0);
        setCurrentPage(0);
        setTotalPages(0);
        setTransactions([]);
        setError(null);
        setMessage("Starting...");

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
            readerRef.current = reader;
            const decoder = new TextDecoder();
            let lineBuffer = "";

            while (true) {
                if (ctrl.signal.aborted) {
                    console.log("[useExtract] Signal aborted — breaking read loop");
                    break;
                }

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
                            if (isPausedRef.current) {
                                if (data.percent != null) progressBufferRef.current.progress = data.percent;
                                if (data.message != null) progressBufferRef.current.message = data.message;
                                if (data.currentPage != null) progressBufferRef.current.currentPage = data.currentPage;
                                if (data.totalPages != null) progressBufferRef.current.totalPages = data.totalPages;
                            } else {
                                setProgress(data.percent ?? 0);
                                setMessage(data.message ?? "");
                                if (data.currentPage != null) setCurrentPage(data.currentPage);
                                if (data.totalPages != null) setTotalPages(data.totalPages);
                            }

                        } else if (data.type === "transaction") {
                            const tx = data.transaction as ExtractedTransaction;
                            if (isPausedRef.current) {
                                txBufferRef.current.push(tx);
                            } else {
                                txCountRef.current += 1;
                                setTransactions(prev => [...prev, tx]);
                            }

                        } else if (data.type === "done") {
                            const finalTxs = (data.transactions ?? []) as ExtractedTransaction[];
                            setTransactions(finalTxs);
                            txCountRef.current = finalTxs.length;
                            setProgress(100);
                            updateScanState("done");
                            setMessage(`Complete — ${finalTxs.length} transactions found`);

                        } else if (data.type === "aborted") {
                            updateScanState("stopped");
                            setMessage(`Stopped — ${txCountRef.current} transactions saved`);

                        } else if (data.type === "error") {
                            setError(data.message);
                            updateScanState("error");
                        }
                    } catch { /* skip malformed SSE line */ }
                }
            }
        } catch (err: any) {
            if (err.name === "AbortError" || ctrl.signal.aborted) {
                updateScanState("stopped");
                setMessage(`Stopped — ${txCountRef.current} transactions saved`);
            } else {
                console.error("[useExtract] error:", err);
                setError(err.message ?? "Unknown error");
                updateScanState("error");
            }
        } finally {
            readerRef.current = null;
        }
    }, []);

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

    return {
        scanState,
        progress,
        message,
        currentPage,
        totalPages,
        transactions,
        error,
        extractPDF,
        extractImage,
        pause,
        resume,
        stop,
        reset,
        isScanning: scanState === "scanning",
        isPaused: scanState === "paused",
        isStopped: scanState === "stopped",
        isDone: scanState === "done",
        isError: scanState === "error",
    };
}
