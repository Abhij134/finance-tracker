"use client";

import { useScanContext } from "./scan-context";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle, FileText, StopCircle } from "lucide-react";

export function FloatingScanProgress() {
    const { scanState, isScanning, cancelScan } = useScanContext();

    const isVisible = scanState.status !== "idle" && scanState.status !== "analyzing";

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 80, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 80, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="fixed bottom-24 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-[50] sm:w-[340px] rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden pointer-events-none"
                >
                    {/* Animated progress bar at top */}
                    <div className="h-1 bg-muted w-full">
                        <motion.div
                            className={`h-full transition-colors duration-500 ${scanState.status === "success"
                                ? "bg-emerald-500"
                                : scanState.status === "error"
                                    ? "bg-red-500"
                                    : "bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500"
                                }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${scanState.progress}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                    </div>

                    <div className="p-4 flex items-center gap-3">
                        {/* Icon */}
                        <div className={`p-2.5 rounded-xl shrink-0 ${scanState.status === "success"
                            ? "bg-emerald-500/15 text-emerald-500"
                            : scanState.status === "error"
                                ? "bg-red-500/15 text-red-500"
                                : "bg-blue-500/15 text-blue-500"
                            }`}>
                            {scanState.status === "success" ? (
                                <CheckCircle2 className="h-5 w-5" />
                            ) : scanState.status === "error" ? (
                                <AlertCircle className="h-5 w-5" />
                            ) : isScanning ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <FileText className="h-5 w-5" />
                            )}
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                                {scanState.status === "success"
                                    ? "Scan Complete"
                                    : scanState.status === "error"
                                        ? "Scan Failed"
                                        : scanState.totalChunks > 1
                                            ? `Scanning page ${scanState.currentChunk} of ${scanState.totalChunks}`
                                            : "Scanning..."}
                            </p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {scanState.status === "analyzing" || scanState.status === "extracting"
                                    ? scanState.extractedCount > 0
                                        ? `${scanState.extractedCount} transactions found so far`
                                        : "Looking for transactions..."
                                    : scanState.statusText}
                            </p>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2 shrink-0 pointer-events-auto">
                            {isScanning && (
                                <button
                                    onClick={cancelScan}
                                    className="p-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-colors"
                                    title="Stop scanning"
                                >
                                    <StopCircle className="h-4 w-4" />
                                </button>
                            )}
                            <span className={`text-sm font-bold tabular-nums ${scanState.status === "success"
                                ? "text-emerald-500"
                                : scanState.status === "error"
                                    ? "text-red-500"
                                    : "text-blue-500"
                                }`}>
                                {scanState.progress}%
                            </span>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
