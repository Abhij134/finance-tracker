"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, Loader2, CheckCircle2, AlertCircle, StopCircle, ScanLine, X } from "lucide-react";
import { toast } from "sonner";
import { scanReceipt } from "../app/actions/scan";
import { useScanContext } from "./scan-context";

interface PDFScannerProps {
  onTransactionsExtracted: (data: any[] | ((prev: any[]) => any[])) => void;
  onLoadingChange?: (loading: boolean) => void;
}

type UploadState = "idle" | "extracting" | "analyzing" | "success" | "error";

export function PDFScanner({ onTransactionsExtracted, onLoadingChange }: PDFScannerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const extractionCancelledRef = useRef(false); // ← cancel flag for extraction phase
  const { startScan, cancelScan, scanState, isScanning: isGlobalScanning } = useScanContext();

  const effectiveState = isGlobalScanning || scanState.status === "success"
    ? (scanState.status as UploadState)
    : uploadState;
  const effectiveProgress = isGlobalScanning || scanState.status === "success"
    ? scanState.progress
    : progress;
  const effectiveStatusText = isGlobalScanning || scanState.status === "success"
    ? scanState.statusText
    : statusText;

  const isActivelyWorking =
    effectiveState === "extracting" ||
    effectiveState === "analyzing" ||
    isGlobalScanning;

  /* ── Cancel entire process ─────────────────────────────────────────── */
  const handleCancel = () => {
    if (isGlobalScanning) {
      cancelScan();
      toast.info("Scan stopped. Already-imported transactions are saved.");
    }
    extractionCancelledRef.current = true;
    setUploadState("idle");
    setProgress(0);
    setStatusText("");
    onLoadingChange?.(false);
  };

  /* ── PDF extraction ────────────────────────────────────────────────── */
  const extractTextFromPDF = async (file: File): Promise<string[]> => {
    extractionCancelledRef.current = false;
    setUploadState("extracting");
    setProgress(10);
    setStatusText("Reading document structure...");

    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const chunks: string[] = [];
    let currentChunkText = "";
    const PAGES_PER_CHUNK = 10;

    for (let i = 1; i <= pdf.numPages; i++) {
      if (extractionCancelledRef.current) throw new Error("CANCELLED");

      // Inject micro-pause to un-freeze main thread
      await new Promise(r => setTimeout(r, 10));

      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      currentChunkText += pageText + "\n";

      // If we've reached 10 pages or the last page, push the chunk
      if (i % PAGES_PER_CHUNK === 0 || i === pdf.numPages) {
        chunks.push(currentChunkText);
        currentChunkText = "";
      }

      setProgress(10 + Math.round((i / pdf.numPages) * 30));
      setStatusText(`Extracting page ${i} of ${pdf.numPages}...`);
    }

    if (chunks.length === 0 || chunks.join("").trim().length === 0)
      throw new Error("No text found. If this is a scanned receipt, upload it as an image.");

    return chunks;
  };

  const processChunks = async (chunks: string[]) => {
    if (extractionCancelledRef.current) return;
    toast.info(`Document split into ${chunks.length} processing unit${chunks.length > 1 ? "s" : ""}. Scanning in background.`);
    startScan(chunks, (newTxs) => {
      onTransactionsExtracted(newTxs);
    });
  };

  /* ── Image processing ──────────────────────────────────────────────── */
  const processImage = async (file: File) => {
    extractionCancelledRef.current = false;
    setUploadState("extracting");
    setProgress(30);
    setStatusText("Reading image...");
    onLoadingChange?.(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (extractionCancelledRef.current) return;
        try {
          const base64String = reader.result as string;
          setUploadState("analyzing");
          setProgress(60);
          setStatusText("AI analysis in progress...");
          const response: any = await scanReceipt(base64String);
          if (extractionCancelledRef.current) return;
          if (response?.error || response?.success === false) {
            toast.error(response?.error || "Failed to scan.");
            handleError();
            return;
          }
          if (response?.transactions) finishUpload(response.transactions);
          else handleError();
        } catch {
          if (!extractionCancelledRef.current) handleError();
        }
      };
      reader.readAsDataURL(file);
    } catch {
      if (!extractionCancelledRef.current) handleError();
    }
  };

  const finishUpload = (transactions: any[]) => {
    setProgress(100);
    setUploadState("success");
    setStatusText(`Complete! ${transactions.length} transactions extracted.`);
    onTransactionsExtracted(transactions);
    onLoadingChange?.(false);
    setTimeout(() => { setUploadState("idle"); setProgress(0); setStatusText(""); }, 3000);
  };

  const handleError = () => {
    setUploadState("error");
    setStatusText("Failed to process file.");
    onLoadingChange?.(false);
    setTimeout(() => { setUploadState("idle"); setProgress(0); setStatusText(""); }, 3000);
  };

  const handleFile = async (file: File) => {
    if (file.type === "application/pdf") {
      try {
        const text = await extractTextFromPDF(file);
        if (!extractionCancelledRef.current) await processChunks(text);
      } catch (err: any) {
        if (err.message !== "CANCELLED") {
          toast.error(err.message || "Error processing PDF");
          handleError();
        }
      }
    } else if (file.type.startsWith("image/")) {
      await processImage(file);
    } else {
      toast.error("Please upload a valid PDF or Image file.");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleFile(file);
    e.target.value = "";
  };

  /* ── Idle state — compact button ───────────────────────────────────── */
  if (effectiveState === "idle") {
    return (
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
    );
  }

  /* ── Active state — compact progress with cancel ───────────────────── */
  return (
    <motion.div
      key="progress"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm w-full"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="p-1 bg-muted rounded-md text-primary shrink-0">
          {effectiveState === "success"
            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            : effectiveState === "error"
              ? <AlertCircle className="w-3.5 h-3.5 text-destructive" />
              : <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">
            {effectiveState === "extracting" ? "Extracting text..." :
              effectiveState === "analyzing" ? "AI analyzing..." :
                effectiveState === "success" ? "Import complete!" : "Error"}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">{effectiveStatusText}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono text-muted-foreground">{effectiveProgress}%</span>
          {/* Cancel button — always shown while working */}
          {isActivelyWorking && effectiveState !== "success" && (
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-semibold hover:bg-red-500/25 transition-colors"
              title="Cancel"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
          )}
        </div>
      </div>
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${effectiveProgress}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className={`h-full rounded-full ${effectiveState === "error" ? "bg-destructive" : "bg-primary"}`}
        />
      </div>
    </motion.div>
  );
}