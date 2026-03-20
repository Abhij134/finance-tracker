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
    startScan: (chunks: string[]) => void;
    cancelScan: () => void;
    isScanning: boolean;
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
    const cancelledRef = useRef(false);
    const chunksRef = useRef<string[]>([]);

    const processChunksSequentially = useCallback(async (chunks: string[], startIdx: number) => {
        if (processingRef.current) return;
        processingRef.current = true;
        cancelledRef.current = false;

        let allExtracted = scanState.extractedCount;
        let runningMerchants = scanState.recentMerchants || [];

        for (let i = startIdx; i < chunks.length; i++) {
            const chunkNum = i + 1;
            const progressPct = Math.round((chunkNum / chunks.length) * 80) + 10;

            const displayText = `Scanning page ${chunkNum} of ${chunks.length}`;

            const newState: ScanState = {
                status: "analyzing",
                progress: progressPct,
                statusText: displayText,
                totalChunks: chunks.length,
                currentChunk: chunkNum,
                extractedCount: allExtracted,
                recentMerchants: runningMerchants,
            };
            setScanState(newState);
            saveToSession(newState, chunks.slice(i));

            try {
                const response = await fetch("/api/scan", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ textChunk: chunks[i] }),
                });

                const result = await response.json();
                if (result.success && result.transactions) {
                    allExtracted += result.count;

                    // Pluck new valid merchant names to display
                    const newMerchants = result.transactions
                        .filter((tx: any) => tx.merchant && tx.merchant !== 'Unknown')
                        .map((tx: any) => tx.merchant);

                    if (newMerchants.length > 0) {
                        const combined = Array.from(new Set([...runningMerchants, ...newMerchants]));
                        runningMerchants = combined.slice(-5);
                    }
                    // Update extracted count but keep the "X of Y" status text
                    setScanState(prev => ({
                        ...prev,
                        extractedCount: allExtracted,
                        recentMerchants: runningMerchants,
                    }));
                }
            } catch (err) {
                console.error(`[ScanContext] chunk ${chunkNum} error:`, err);
            }

            // Check if cancelled before sending next chunk
            if (cancelledRef.current) {
                console.log(`[ScanContext] Scan cancelled after chunk ${chunkNum}. ${allExtracted} transactions imported so far.`);
                break;
            }

            // Interruptible 25s delay — polls cancelledRef every 250ms so Stop works instantly
            if (i < chunks.length - 1) {
                const DELAY_MS = 25000;
                const POLL_MS = 250;
                const steps = DELAY_MS / POLL_MS;
                for (let s = 0; s < steps; s++) {
                    if (cancelledRef.current) break;
                    await new Promise(resolve => setTimeout(resolve, POLL_MS));
                }
            }

            // Check again after delay
            if (cancelledRef.current) {
                console.log(`[ScanContext] Scan cancelled during delay after chunk ${chunkNum}.`);
                break;
            }
        }

        // If cancelled mid-scan, show partial success
        if (cancelledRef.current) {
            const cancelState: ScanState = {
                status: "success",
                progress: 100,
                statusText: `Stopped. ${allExtracted} transactions imported.`,
                totalChunks: chunks.length,
                currentChunk: scanState.currentChunk,
                extractedCount: allExtracted,
                recentMerchants: runningMerchants,
            };
            setScanState(cancelState);
            clearSession();
            processingRef.current = false;
            cancelledRef.current = false;

            setTimeout(() => {
                setScanState(defaultState);
            }, 4000);
            return;
        }

        const doneState: ScanState = {
            status: "success",
            progress: 100,
            statusText: `Complete! ${allExtracted} transactions imported.`,
            totalChunks: chunks.length,
            currentChunk: chunks.length,
            extractedCount: allExtracted,
            recentMerchants: runningMerchants,
        };
        setScanState(doneState);
        clearSession();
        processingRef.current = false;

        // Auto-reset after 5 seconds
        setTimeout(() => {
            setScanState(defaultState);
        }, 5000);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Resume interrupted scan on mount (handles hard reload)
    useEffect(() => {
        const saved = loadFromSession();
        if (saved && saved.pendingChunks.length > 0 && saved.state.status === "analyzing") {
            console.log(`[ScanContext] Resuming interrupted scan: ${saved.pendingChunks.length} chunks remaining`);
            setScanState(saved.state);
            chunksRef.current = saved.pendingChunks;
            processChunksSequentially(saved.pendingChunks, 0);
        }
    }, [processChunksSequentially]);

    const startScan = useCallback((chunks: string[]) => {
        if (processingRef.current) return;
        cancelledRef.current = false;
        chunksRef.current = chunks;
        processChunksSequentially(chunks, 0);
    }, [processChunksSequentially]);

    const cancelScan = useCallback(() => {
        cancelledRef.current = true;
    }, []);

    return (
        <ScanContext.Provider value={{
            scanState,
            startScan,
            cancelScan,
            isScanning: scanState.status === "analyzing" || scanState.status === "extracting",
        }}>
            {children}
        </ScanContext.Provider>
    );
}
