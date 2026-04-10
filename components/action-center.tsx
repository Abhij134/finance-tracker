"use client";
import { useState } from "react";
import { Plus, Upload } from "lucide-react";
import { ManualTransactionModal } from "./manual-transaction-modal";
import { BulkReviewModal } from "./bulk-review-modal";
import { useTransactions } from "@/app/(main)/transactions-context";
import { CATEGORIES } from "@/lib/constants";
import { toast } from "sonner";
import { PDFScanner } from "./PDFScanner";

export function ActionCenter() {
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<any[] | null>(null);
  const { addBulkTransactions } = useTransactions();

  const handleBulkSave = async (transactionsToSave: any[]) => {
    const txsToInsert = transactionsToSave.map((tx) => {
      const rawAmount = typeof tx.amount === "number" ? tx.amount : parseFloat(tx.amount || "0");
      const type = tx.type?.toString().toUpperCase();
      const amount = Math.abs(rawAmount) * (type === "EXPENSE" ? -1 : type === "INCOME" ? 1 : -1);
      const cat = CATEGORIES.find((c) => c.label.toLowerCase() === tx.category?.toLowerCase()) ?? CATEGORIES.find(c => c.label === "Other") ?? CATEGORIES[0];
      return {
        date: tx.date || new Date().toISOString().split("T")[0],
        merchant: tx.merchant || "Unknown",
        category: cat,
        method: "ai" as "ai" | "manual",
        amount,
        referenceId: tx.referenceId || null,
      };
    });

    const totalAttempted = txsToInsert.length;
    const response = await addBulkTransactions(txsToInsert);
    if (response?.success) {
      const dup = totalAttempted - response.addedCount;
      if (response.addedCount === 0 && dup > 0) toast.info(`All ${dup} already in database.`);
      else if (dup > 0) toast.success(`Saved ${response.addedCount} new. Ignored ${dup} duplicates.`);
      else toast.success(`Saved ${response.addedCount} transactions!`);
      setScannedData(null);
    }
  };

  return (
    <>
      {/* ── Compact 2-column action row ───────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* Add Transaction — compact button card */}
        <button
          onClick={() => setIsManualOpen(true)}
          disabled={isScanning}
          type="button"
          className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-sm hover:bg-muted hover:-translate-y-0.5 hover:shadow-md transition-all disabled:opacity-50 w-full"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Plus className="h-4 w-4" />
          </span>
          <span className="truncate">Add Transaction</span>
        </button>

        {/* Upload Receipt — compact, no tall box */}
        <div className={`transition-opacity`}>
          <PDFScanner
            onTransactionsExtracted={async (data) => {
              if (Array.isArray(data) && isScanning) {
                const txsToInsert = data.map((tx) => {
                  const rawAmount = typeof tx.amount === "number" ? tx.amount : parseFloat(tx.amount || "0");
                  const type = tx.type?.toString().toUpperCase();
                  const amount = Math.abs(rawAmount) * (type === "EXPENSE" ? -1 : type === "INCOME" ? 1 : -1);
                  const cat = CATEGORIES.find((c) => c.label.toLowerCase() === tx.category?.toLowerCase()) ?? CATEGORIES.find(c => c.label === "Other") ?? CATEGORIES[0];
                  return {
                    date: tx.date || new Date().toISOString().split("T")[0],
                    merchant: tx.merchant || "Unknown",
                    category: cat,
                    method: "ai" as "ai" | "manual",
                    amount,
                    referenceId: tx.referenceId || null,
                  };
                });
                await addBulkTransactions(txsToInsert);
              } else if (Array.isArray(data)) {
                setScannedData(data);
              }
            }}
            onLoadingChange={setIsScanning}
          />
        </div>
      </div>

      {isManualOpen && (
        <ManualTransactionModal open={isManualOpen} onClose={() => setIsManualOpen(false)} />
      )}
      {scannedData && (
        <BulkReviewModal
          transactions={scannedData}
          onClose={() => setScannedData(null)}
          onSave={handleBulkSave}
        />
      )}
    </>
  );
}