"use client";

import { useScanContext } from "./scan-context";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle, FileText, StopCircle, Pause, Play } from "lucide-react";

export function FloatingScanProgress() {
    const { scanState, isScanning: isLegacyScanning, cancelScan, extract, stopExtract, pauseExtract, resumeExtract, resetExtract } = useScanContext();

    // Show for either legacy path or new streaming path
    const isExtractActive = extract.scanState !== "idle";
    const isLegacyActive = scanState.status !== "idle";

    const isVisible = isExtractActive || isLegacyActive;

    // Prefer new extract state; fall back to legacy
    const status = isExtractActive
        ? (extract.scanState === "done" ? "success" : extract.scanState === "error" ? "error" : extract.scanState === "stopped" ? "error" : "analyzing")
        : scanState.status;

    const progress = isExtractActive ? extract.progress : scanState.progress;

    const title = isExtractActive
        ? (extract.scanState === "done"
            ? "Scan Complete"
            : extract.scanState === "error"
                ? "Scan Failed"
                : extract.scanState === "paused"
                    ? "Scan Paused"
                    : extract.scanState === "stopped"
                        ? "Scan Stopped"
                        : extract.totalPages > 1
                            ? `Scanning page ${extract.currentPage} of ${extract.totalPages}`
                            : "Scanning...")
        : (scanState.status === "success" ? "Scan Complete"
            : scanState.status === "error" ? "Scan Failed"
                : scanState.totalChunks > 1
                    ? `Scanning page ${scanState.currentChunk} of ${scanState.totalChunks}`
                    : "Scanning...");

    const subtitle = isExtractActive
        ? (extract.scanState === "done" || extract.scanState === "stopped"
            ? extract.message
            : extract.transactions.length > 0
                ? `${extract.transactions.length} transactions found so far`
                : extract.message || "Looking for transactions...")
        : (scanState.status === "analyzing" || scanState.status === "extracting"
            ? scanState.extractedCount > 0
                ? `${scanState.extractedCount} transactions found so far`
                : "Looking for transactions..."
            : scanState.statusText);

    const isActivelyScanning = isExtractActive
        ? (extract.scanState === "scanning")
        : isLegacyScanning;

    const handleStop = () => {
        if (isExtractActive) stopExtract();
        else cancelScan();
    };

    const handleDismiss = () => {
        if (isExtractActive) resetExtract();
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, x: "-50%", y: 80, scale: 0.95 }}
                    animate={{ opacity: 1, x: "-50%", y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: "-50%", y: 80, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="fixed bottom-24 sm:bottom-10 left-1/2 z-[50] w-[calc(100vw-2rem)] sm:w-[340px] rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden"
                >
                    {/* Progress bar */}
                    <div className="h-1 bg-muted w-full">
                        <motion.div
                            className={`h-full transition-colors duration-500 ${status === "success"
                                ? "bg-emerald-500"
                                : status === "error"
                                    ? "bg-red-500"
                                    : extract.scanState === "paused"
                                        ? "bg-amber-500"
                                        : "bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500"
                                }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                    </div>

                    <div className="p-4 flex items-center gap-3">
                        {/* Icon */}
                        <div className={`p-2.5 rounded-xl shrink-0 ${status === "success"
                            ? "bg-emerald-500/15 text-emerald-500"
                            : status === "error"
                                ? "bg-red-500/15 text-red-500"
                                : extract.scanState === "paused"
                                    ? "bg-amber-500/15 text-amber-500"
                                    : "bg-blue-500/15 text-blue-500"
                            }`}>
                            {status === "success" ? (
                                <CheckCircle2 className="h-5 w-5" />
                            ) : status === "error" ? (
                                <AlertCircle className="h-5 w-5" />
                            ) : isActivelyScanning ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <FileText className="h-5 w-5" />
                            )}
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{title}</p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            {/* Pause / Resume — only for new extract path */}
                            {isExtractActive && extract.scanState === "scanning" && (
                                <button
                                    onClick={pauseExtract}
                                    className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 transition-colors"
                                    title="Pause scanning"
                                >
                                    <Pause className="h-4 w-4" />
                                </button>
                            )}
                            {isExtractActive && extract.scanState === "paused" && (
                                <button
                                    onClick={resumeExtract}
                                    className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                                    title="Resume scanning"
                                >
                                    <Play className="h-4 w-4" />
                                </button>
                            )}

                            {/* Stop button while active */}
                            {(isActivelyScanning || extract.scanState === "paused") && (
                                <button
                                    onClick={handleStop}
                                    className="p-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-colors"
                                    title="Stop scanning"
                                >
                                    <StopCircle className="h-4 w-4" />
                                </button>
                            )}

                            {/* Progress % */}
                            <span className={`text-sm font-bold tabular-nums ${status === "success"
                                ? "text-emerald-500"
                                : status === "error"
                                    ? "text-red-500"
                                    : "text-blue-500"
                                }`}>
                                {Math.round(progress || 0)}%
                            </span>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
