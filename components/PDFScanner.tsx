"use client";

import React, { useState, useRef, useEffect } from "react";
import { UploadCloud, ScanLine } from "lucide-react";
import { useScanContext } from "./scan-context";
import { ScanProgress } from "./ScanProgress";
import { toast } from "sonner";

interface PDFScannerProps {
  onTransactionsExtracted: (data: any[] | ((prev: any[]) => any[])) => void;
  onLoadingChange?: (loading: boolean) => void;
}

function mapToAppCategory(aiCategory: string): string {
  const validCategories = [
    "Food & Dining", "Groceries", "Shopping", "Transport",
    "Fuel & Auto", "Travel", "Health & Medical", "Bills & Utilities",
    "Entertainment", "Education", "UPI Transfer", "Investment",
    "Subscriptions", "Rent & Housing", "Income", "Other",
  ];
  return validCategories.includes(aiCategory) ? aiCategory : "Other";
}

export function PDFScanner({ onTransactionsExtracted, onLoadingChange }: PDFScannerProps) {
  const [isDragging, setIsDragging] = useState(false);

  const {
    extract,
    extractPDF,
    extractImage,
    pauseExtract,
    resumeExtract,
    stopExtract,
    resetExtract,
    onTransactionsReady,
    cancelScan,
    isScanning: isGlobalScanning,
    setExternalScanState,
    resetExternalScanState,
  } = useScanContext();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Register a callback so when the scan finishes (even on another page),
  // the transactions are passed back to the action-center handler
  useEffect(() => {
    onTransactionsReady((finalTxs) => {
      const mapped = finalTxs
        // Bug 2 fix: drop zero/falsy amounts before they reach Prisma
        .filter(t => !!t.amount && t.amount !== 0)
        .map(t => {
          // Bug 2 fix: validate date; fall back to today if malformed
          const rawDate = t.date;
          const parsedDate = rawDate ? new Date(rawDate) : null;
          const safeDate = parsedDate && !isNaN(parsedDate.getTime())
            ? rawDate
            : new Date().toISOString();

          return {
            date: safeDate,
            merchant: t.description || "Unknown",
            amount: Math.abs(t.amount || 0),
            category: mapToAppCategory(t.category ?? "Other"),
            type: (t.type === "debit" || !t.type) ? "Expense" : "Income",
            referenceId: t.referenceId || null,
          };
        });
      onTransactionsExtracted(mapped);
    });
  }, [onTransactionsReady, onTransactionsExtracted]);

  // Sync global extract state into the legacy ScanContext floating widget
  useEffect(() => {
    if (!setExternalScanState || !resetExternalScanState) return;

    const { scanState, progress, message, transactions } = extract;

    if (scanState === "scanning" || scanState === "paused") {
      setExternalScanState({
        status: "analyzing",
        progress,
        statusText: message || "Extracting text and analyzing...",
        totalChunks: 1,
        currentChunk: 1,
        extractedCount: transactions.length,
        recentMerchants: transactions.map(t => t.description || "Unknown").slice(-5),
      });
    } else if (scanState === "done") {
      setExternalScanState({
        status: "success",
        progress: 100,
        statusText: `Imported ${transactions.length} transactions.`,
        totalChunks: 1,
        currentChunk: 1,
        extractedCount: transactions.length,
        recentMerchants: transactions.map(t => t.description || "Unknown").slice(-5),
      });
      setTimeout(() => resetExternalScanState?.(), 5000);
    } else if (scanState === "error") {
      setExternalScanState({
        status: "error",
        progress,
        statusText: extract.error || "Extraction failed.",
        totalChunks: 1,
        currentChunk: 1,
        extractedCount: 0,
        recentMerchants: [],
      });
      setTimeout(() => resetExternalScanState?.(), 5000);
    }
  }, [extract.scanState, extract.progress]);

  const handleFile = async (file: File) => {
    if (file.type === "application/pdf") {
      onLoadingChange?.(true);
      await extractPDF(file);
      onLoadingChange?.(false);
    } else if (file.type.startsWith("image/")) {
      onLoadingChange?.(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        await extractImage(reader.result as string);
        onLoadingChange?.(false);
      };
      reader.readAsDataURL(file);
    } else {
      toast.error("Please upload a valid PDF or Image file.");
    }
  };

  const handleFileRef = useRef(handleFile);
  useEffect(() => { handleFileRef.current = handleFile; }, [handleFile]);

  // Global paste listener (works from any page since PDFScanner is in the layout indirectly via action-center)
  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      const file = e.clipboardData?.files?.[0] ||
        Array.from(e.clipboardData?.items || []).find(item => item.kind === "file")?.getAsFile();
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
    cancelScan();
    stopExtract();
  }, [cancelScan, stopExtract]);

  const isActive = isGlobalScanning || (extract.scanState !== "idle");

  return isActive ? (
    <ScanProgress
      isVisible={isActive}
      scanState={isGlobalScanning && extract.scanState === "idle" ? "scanning" : extract.scanState}
      progress={extract.progress}
      message={extract.message}
      currentPage={extract.currentPage}
      totalPages={extract.totalPages}
      transactions={extract.transactions}
      error={extract.error}
      mode="pdf"
      onStop={handleStop}
      onPause={pauseExtract}
      onResume={resumeExtract}
      onReset={resetExtract}
      onClose={resetExtract}
    />
  ) : (
    <div className="flex flex-col gap-1.5 w-full">
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
        className={`flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-sm hover:bg-muted hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer w-full select-none ${isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/30"
          }`}
      >
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf,image/*" className="hidden" />
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors ${isDragging ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}>
          {isDragging ? <UploadCloud className="h-3.5 w-3.5" /> : <ScanLine className="h-3.5 w-3.5" />}
        </span>
        <span className="truncate">{isDragging ? "Drop to scan" : "Upload Receipt"}</span>
      </div>

      <div
        contentEditable
        suppressContentEditableWarning
        data-placeholder="...or Tap here to Paste Images"
        className="w-full text-center text-[10px] font-medium rounded-lg border border-dashed border-border bg-card/40 shadow-sm px-3 py-1.5 focus:outline-none focus:border-primary/40 focus:bg-background transition-colors cursor-text empty:before:content-[attr(data-placeholder)] before:text-muted-foreground/55 before:pointer-events-none outline-none"
        onPaste={async (e) => {
          e.preventDefault();
          const file = e.clipboardData?.files?.[0] ||
            Array.from(e.clipboardData?.items || []).find(item => item.kind === "file")?.getAsFile();
          if (file && (file.type === "application/pdf" || file.type.startsWith("image/"))) {
            toast.info("Pasted file detected, processing...");
            await handleFileRef.current(file);
          } else {
            toast.error("iOS blocks pasting PDFs! Please paste an Image, or use 'Choose File' instead.", { duration: 6000 });
          }
          if (e.currentTarget) e.currentTarget.innerHTML = "";
        }}
        onInput={(e) => { if (e.currentTarget) e.currentTarget.innerHTML = ""; }}
      />
    </div>
  );
}