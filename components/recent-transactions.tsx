"use client";
import { useState, useMemo, useEffect } from "react";
import { PenLine, Cpu, Plus } from "lucide-react";
import { format } from "date-fns";
import { useTransactions } from "@/app/(main)/transactions-context";
import { ManualTransactionModal } from "./manual-transaction-modal";

function formatAmount(n: number) {
  const f = Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(Math.abs(n));
  return n < 0 ? `-${f}` : `+${f}`;
}

export function RecentTransactions() {
  const { transactions, loadMore, isLoadingMore, hasMore } = useTransactions();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(10);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show the most recent transactions by date
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, displayLimit);
  }, [transactions, displayLimit]);

  const handleLoadMore = () => {
    if (displayLimit < transactions.length) {
      setDisplayLimit(prev => prev + 10);
    } else if (hasMore) {
      loadMore();
      setDisplayLimit(prev => prev + 10);
    }
  };

  const showLoadMore = displayLimit < transactions.length || hasMore;

  return (
    <>
      <section className="rounded-xl border border-border bg-card text-card-foreground shadow-md">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold">Recent Transactions</h2>
        </div>
        <div className="max-h-[400px] overflow-y-auto custom-scrollbar pr-2 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="sticky left-0 bg-card px-4 py-3">Date</th>
                <th className="px-4 py-3">Merchant</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    No transactions yet. Add one to get started!
                  </td>
                </tr>
              )}
              {recentTransactions.map((tx: any) => (
                <tr
                  key={tx.id}
                  className="text-sm transition-colors hover:bg-muted/20"
                >
                  <td className="sticky left-0 bg-card/95 backdrop-blur px-4 py-3 text-muted-foreground whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {mounted ? format(new Date(tx.date), 'dd MMM yyyy') : '...'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {mounted ? format(new Date(tx.date), 'hh:mm a') : '...'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">{tx.merchant}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium text-white ${tx.category.color}`}
                    >
                      {tx.category.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs">
                      {tx.method === "manual" ? (
                        <>
                          <PenLine className="h-3.5 w-3.5" />
                          <span>Manual</span>
                        </>
                      ) : (
                        <>
                          <Cpu className="h-3.5 w-3.5" />
                          <span>AI</span>
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    <span
                      className={
                        tx.amount < 0 ? "text-red-500" : "text-emerald-500"
                      }
                    >
                      {formatAmount(tx.amount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {showLoadMore && mounted && (
          <div className="border-t border-border p-3 flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="text-xs font-semibold text-primary hover:underline disabled:opacity-50 flex items-center gap-2"
            >
              {isLoadingMore ? "Loading..." : "Load More Transactions"}
            </button>
          </div>
        )}
      </section>

      <ManualTransactionModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
    </>
  );
}
