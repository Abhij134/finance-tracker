"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, Loader2, CheckCircle2, AlertCircle, StopCircle, ScanLine, X } from "lucide-react";
import { useScanContext } from "./scan-context";
import { ScanProgress } from "./ScanProgress";
import { toast } from "sonner";
import { useExtract } from "@/hooks/useExtract";

type UploadState = "idle" | "extracting" | "analyzing" | "success" | "error";

interface PDFScannerProps {
  onTransactionsExtracted: (data: any[] | ((prev: any[]) => any[])) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export function PDFScanner({ onTransactionsExtracted, onLoadingChange }: PDFScannerProps) {
  const [isDragging, setIsDragging] = useState(false);

  // Legacy states (kept to satisfy original UI conditions without breaking anything)
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const extractionCancelledRef = useRef(false);
  const { startScan, cancelScan, scanState: globalScanState, isScanning: isGlobalScanning, setExternalScanState, resetExternalScanState } = useScanContext();

  // Bind to new useExtract interface
  const {
    scanState, progress: newProgress, message, currentPage, totalPages,
    transactions, error: extractError, extractPDF, extractImage,
    pause, resume, stop, reset,
    isScanning: isExtracting,
  } = useExtract();

  const effectiveState = isGlobalScanning || globalScanState.status === "success"
    ? (globalScanState.status as UploadState)
    : uploadState;
  const effectiveProgress = isGlobalScanning || globalScanState.status === "success"
    ? globalScanState.progress
    : progress;
  const effectiveStatusText = isGlobalScanning || globalScanState.status === "success"
    ? globalScanState.statusText
    : statusText;

  const isActivelyWorking =
    effectiveState === "extracting" ||
    effectiveState === "analyzing" ||
    isGlobalScanning ||
    isExtracting;

  function mapToAppCategory(aiCategory: string): string {
    // Direct passthrough — categorize.ts now outputs exact app category names
    const validCategories = [
      "Food & Dining", "Groceries", "Shopping", "Transport",
      "Fuel & Auto", "Travel", "Health & Medical", "Bills & Utilities",
      "Entertainment", "Education", "UPI Transfer", "Investment",
      "Subscriptions", "Rent & Housing", "Income", "Other",
    ];
    return validCategories.includes(aiCategory) ? aiCategory : "Other";
  }

  useEffect(() => {
    if ((scanState !== "done" && scanState !== "stopped") || transactions.length === 0) {
      return;
    }
    const mapped = transactions.map(t => {
      let category = mapToAppCategory(t.category ?? "Other");

      return {
        date: t.date,
        merchant: t.description || 'Unknown',
        amount: Math.abs(t.amount || 0),
        category,
        type: (t.type === 'debit' || !t.type) ? 'Expense' : 'Income',
        referenceId: t.referenceId || null,
      };
    });
    onTransactionsExtracted(mapped);

    if (scanState === "done") {
      // Mimic success state for the old UI hooks
      setUploadState("success");
      setProgress(100);
      setStatusText(`Complete! ${transactions.length} transactions extracted.`);
      setTimeout(() => { setUploadState("idle"); setProgress(0); setStatusText(""); reset(); }, 3000);
    }
  }, [scanState]); // only depends on scanState — not transactions array

  // Sync useExtract state to the global floating widget
  useEffect(() => {
    if (!setExternalScanState || !resetExternalScanState) return;

    if (scanState === "scanning" || scanState === "paused") {
      setExternalScanState({
        status: "analyzing",
        progress: newProgress,
        statusText: message || "Extracting text and analyzing...",
        totalChunks: 1,
        currentChunk: 1,
        extractedCount: transactions.length,
        recentMerchants: transactions.map(t => t.description || 'Unknown').slice(-5)
      });
    } else if (scanState === "done") {
      setExternalScanState({
        status: "success",
        progress: 100,
        statusText: `Imported ${transactions.length} transactions.`,
        totalChunks: 1,
        currentChunk: 1,
        extractedCount: transactions.length,
        recentMerchants: transactions.map(t => t.description || 'Unknown').slice(-5)
      });
      setTimeout(() => resetExternalScanState(), 5000);
    } else if (scanState === "error") {
      setExternalScanState({
        status: "error",
        progress: newProgress,
        statusText: extractError || "Extraction failed.",
        totalChunks: 1,
        currentChunk: 1,
        extractedCount: 0,
        recentMerchants: []
      });
      setTimeout(() => resetExternalScanState(), 5000);
    }
  }, [scanState, newProgress]); // only re-run when scanState or progress changes

  useEffect(() => {
    if (extractError) {
      setUploadState("error");
      setStatusText(extractError || "Failed to process file.");
      setTimeout(() => { setUploadState("idle"); setProgress(0); setStatusText(""); }, 3000);
    }
  }, [extractError]);

  const handleCancel = () => {
    if (isGlobalScanning) {
      cancelScan();
      toast.info("Scan stopped. Already-imported transactions are saved.");
    }
    stop(); // stop new extract
    extractionCancelledRef.current = true;
    setUploadState("idle");
    setProgress(0);
    setStatusText("");
    onLoadingChange?.(false);
  };

  const handlePDFUpload = async (file: File) => {
    setUploadState("extracting"); // Trigger old UI loading state
    onLoadingChange?.(true);
    await extractPDF(file);
    onLoadingChange?.(false);
  };

  const handleImageUpload = async (file: File) => {
    setUploadState("extracting");
    onLoadingChange?.(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      await extractImage(base64String);
      onLoadingChange?.(false);
    }
    reader.readAsDataURL(file);
  }

  const handleFile = async (file: File) => {
    if (file.type === "application/pdf") {
      await handlePDFUpload(file);
    } else if (file.type.startsWith("image/")) {
      await handleImageUpload(file);
    } else {
      toast.error("Please upload a valid PDF or Image file.");
    }
  };

  const handleFileRef = useRef(handleFile);
  useEffect(() => {
    handleFileRef.current = handleFile;
  }, [handleFile]);

  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      const file = e.clipboardData?.files?.[0] || Array.from(e.clipboardData?.items || []).find(item => item.kind === 'file')?.getAsFile();
      if (!file) return;

      if (file.type === "application/pdf" || file.type.startsWith("image/")) {
        e.preventDefault();
        toast.info("Pasted file detected, processing...");
        await handleFileRef.current(file);
      }
    };

    document.addEventListener("paste", handleGlobalPaste);
    return () => document.removeEventListener("paste", handleGlobalPaste);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleFile(file);
    e.target.value = "";
  };

  const handleStop = React.useCallback(() => {
    cancelScan();        // stops ScanContext fetch to /api/scan
    stop();              // sets scanState to "stopped", NOT "idle" — keeps UI visible
  }, [cancelScan, stop]);

  const handlePause = React.useCallback(() => {
    pause();
  }, [pause]);

  const handleResume = React.useCallback(() => {
    resume();
  }, [resume]);

  const isActive = isGlobalScanning || (scanState !== "idle");

  /* ── Permanent layout — compact button or inline progress ───────────────────────────────────── */
  return isActive ? (
    <ScanProgress
      isVisible={isActive}
      scanState={isGlobalScanning && scanState === "idle" ? "scanning" : scanState}
      progress={newProgress}
      message={message}
      currentPage={currentPage}
      totalPages={totalPages}
      transactions={transactions}
      error={extractError}
      mode="pdf"
      onStop={handleStop}
      onPause={handlePause}
      onResume={handleResume}
      onReset={reset}
      onClose={reset}
    />
  ) : (
    <div className="flex flex-col gap-2 w-full">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) await handleFile(file);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`flex items-center gap-2.5 rounded-xl border bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-sm hover:bg-muted hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer w-full select-none ${isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/30"
          }`}
      >
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf,image/*" className="hidden" />
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${isDragging ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}>
          {isDragging ? <UploadCloud className="h-4 w-4" /> : <ScanLine className="h-4 w-4" />}
        </span>
        <span className="truncate">{isDragging ? "Drop to scan" : "Upload Receipt"}</span>
      </div>

      <button
        type="button"
        onClick={async () => {
          try {
            if (!navigator.clipboard || !navigator.clipboard.read) {
              toast.error("Browser does not support native clipboard reading. Please manually select the file.");
              return;
            }
            const clipboardItems = await navigator.clipboard.read();
            for (const item of clipboardItems) {
              const types = item.types;
              const pdfType = types.find(t => t === 'application/pdf');
              const imgType = types.find(t => t.startsWith('image/'));

              if (pdfType) {
                const blob = await item.getType(pdfType);
                const file = new File([blob], "pasted-receipt.pdf", { type: pdfType });
                toast.info("Pasted PDF detected, processing...");
                await handleFileRef.current(file);
                return;
              } else if (imgType) {
                const blob = await item.getType(imgType);
                const file = new File([blob], "pasted-receipt.png", { type: imgType });
                toast.info("Pasted Image detected, processing...");
                await handleFileRef.current(file);
                return;
              }
            }
            toast.error("No valid PDF or Image found in clipboard.");
          } catch (err) {
            console.error(err);
            toast.error("Unable to read clipboard. Make sure you allow paste permissions.");
          }
        }}
        className="w-full text-center text-xs font-semibold rounded-xl border border-dashed border-border bg-card/50 shadow-sm px-4 py-3 hover:bg-muted focus:outline-none focus:border-primary/50 transition-colors cursor-pointer text-muted-foreground flex items-center justify-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></svg>
        Tap here to Paste from Clipboard
      </button>
    </div>
  );
}