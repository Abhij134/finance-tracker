"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

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

interface ScanContextType {
    scanState: ScanState;
    startScan: (chunks: string[], onChunk?: (txs: any[]) => void) => void;
    cancelScan: () => void;
    isScanning: boolean;
    setExternalScanState?: React.Dispatch<React.SetStateAction<ScanState>>;
    resetExternalScanState?: () => void;
}

const defaultState: ScanState = {
    status: "idle",
    progress: 0,
    statusText: "",
    totalChunks: 0,
    currentChunk: 0,
    extractedCount: 0,
    recentMerchants: [],
};

const ScanContext = createContext<ScanContextType>({
    scanState: defaultState,
    startScan: () => { },
    cancelScan: () => { },
    isScanning: false,
    setExternalScanState: () => { },
    resetExternalScanState: () => { },
});

export const useScanContext = () => useContext(ScanContext);

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
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function clearSession() {
    if (typeof window !== "undefined") {
        sessionStorage.removeItem(SESSION_KEY);
    }
}

export function ScanProvider({ children }: { children: React.ReactNode }) {
    const [scanState, setScanState] = useState<ScanState>(defaultState);
    const processingRef = useRef(false);
    const abortRef = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const chunksRef = useRef<string[]>([]);

    const processChunksSequentially = useCallback(async (chunks: string[], onChunk?: (txs: any[]) => void) => {
        if (processingRef.current) return;
        processingRef.current = true;

        // Reset state for new scan
        let allExtracted = 0;
        let runningMerchants: string[] = [];
        const PAGES_PER_CHUNK = 10;

        let index = 0;
        for (const chunk of chunks) {
            // ── CHECK ABORT ──
            if (abortRef.current) {
                console.log("Scan aborted by user.");
                break;
            }

            const chunkNum = index + 1;

            // ── Check for RPM Cooldown ──
            if (index > 0 && index % 14 === 0) {
                const COOLDOWN_STEPS = 60;
                for (let s = COOLDOWN_STEPS; s > 0; s--) {
                    if (abortRef.current) break;
                    setScanState(prev => ({
                        ...prev,
                        statusText: `Cooling down API for ${s} seconds to prevent rate limits...`,
                    }));
                    await new Promise(r => setTimeout(r, 1000));
                }
                if (abortRef.current) break;
            }

            const startPage = index * PAGES_PER_CHUNK + 1;
            const endPage = Math.min((index + 1) * PAGES_PER_CHUNK, chunks.length * PAGES_PER_CHUNK);
            const progressPct = Math.round((chunkNum / chunks.length) * 80) + 10;

            setScanState(prev => ({
                ...prev,
                status: "analyzing",
                progress: progressPct,
                statusText: `Scanning pages ${startPage}-${endPage}...`,
                totalChunks: chunks.length,
                currentChunk: chunkNum,
            }));

            try {
                const response = await fetch("/api/scan", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ textChunk: chunk }),
                    signal: abortControllerRef.current?.signal,
                });

                const result = await response.json();

                // ── INSTANT KILL Check (Post-Fetch) ──
                if (abortRef.current) {
                    console.log("Discarding in-flight chunk due to stop.");
                    break;
                }

                if (result.success && result.transactions) {
                    allExtracted += (result.count || 0);
                    const newMerchants = result.transactions
                        .filter((tx: any) => tx.merchant && tx.merchant !== 'Unknown')
                        .map((tx: any) => tx.merchant);

                    if (newMerchants.length > 0) {
                        const combined = Array.from(new Set([...runningMerchants, ...newMerchants]));
                        runningMerchants = combined.slice(-5);
                    }

                    setScanState(prev => ({
                        ...prev,
                        extractedCount: allExtracted,
                        recentMerchants: runningMerchants,
                    }));

                    // ── REAL-TIME RENDER ──
                    if (onChunk && result.transactions.length > 0) {
                        onChunk(result.transactions);
                    }

                    // ── FORCE DOM PAINT (Micro-Yield) ──
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            } catch (err: any) {
                if (err.name === 'AbortError') {
                    console.log("[ScanContext] Fetch aborted.");
                    break;
                }
                console.error(`[ScanContext] chunk ${chunkNum} error:`, err);
            }

            // Check abort again after network call
            if (abortRef.current) break;
            index++;
        }

        // Finalize state
        const finalizedStatus = abortRef.current ? "idle" : "success";
        const finalMessage = abortRef.current
            ? `Stopped. ${allExtracted} transactions imported.`
            : `Complete! ${allExtracted} transactions imported.`;

        setScanState(prev => ({
            ...prev,
            status: finalizedStatus,
            progress: 100,
            statusText: finalMessage,
        }));

        clearSession();
        processingRef.current = false;
        // Reset abort tag AFTER the loop finishes
        setTimeout(() => {
            if (!processingRef.current) {
                setScanState(defaultState);
                abortRef.current = false;
                abortControllerRef.current = null;
            }
        }, 5000);
    }, []);

    const startScan = useCallback((chunks: string[], onChunk?: (txs: any[]) => void) => {
        // Reset abort at start of NEW scan
        abortRef.current = false;
        abortControllerRef.current = new AbortController();
        if (processingRef.current) {
            console.warn("Scan already in progress");
            return;
        }
        chunksRef.current = chunks;
        processChunksSequentially(chunks, onChunk);
    }, [processChunksSequentially]);

    const cancelScan = useCallback(() => {
        abortRef.current = true;
        try { abortControllerRef.current?.abort(); } catch { /* ignore */ }
        // Immediately update UI — don't wait 5 seconds
        setScanState(prev => ({
            ...prev,
            status: "idle",
            statusText: `Stopped. ${prev.extractedCount} transactions saved.`,
            progress: 0,
        }));
        processingRef.current = false;
    }, []);

    const resetExternalScanState = useCallback(() => {
        setScanState(defaultState);
    }, []);

    return (
        <ScanContext.Provider value={{
            scanState,
            startScan,
            cancelScan,
            isScanning: scanState.status === "analyzing" || scanState.status === "extracting",
            setExternalScanState: setScanState,
            resetExternalScanState,
        }}>
            {children}
        </ScanContext.Provider>
    );
}
