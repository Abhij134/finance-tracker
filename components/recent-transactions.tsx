"use client";
import { useState, useMemo, useEffect } from "react";
import { PenLine, Cpu, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
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
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-semibold text-foreground">Recent Transactions</h2>
        </div>
        <div className="pr-2">
          {/* Desktop View Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 desktop-table">
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

          {/* Mobile View Card List */}
          <div className="sm:hidden divide-y divide-border/20">
            {recentTransactions.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-10">
                No transactions yet. Add one to get started!
              </p>
            )}
            <AnimatePresence mode="popLayout">
              {recentTransactions.map((tx: any, idx) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.05, 0.3) }}
                  className="flex items-center justify-between py-3 border-b border-border/30 last:border-0 px-1"
                >
                  {/* Left: Category dot + Merchant */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${tx.category.color.replace('bg-', 'bg-') || 'bg-emerald-500'}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate max-w-[140px]">
                        {tx.merchant}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {mounted ? format(new Date(tx.date), 'dd MMM') : '...'}
                      </p>
                    </div>
                  </div>

                  {/* Right: Category badge + Amount stacked */}
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                    <span className={`text-sm font-semibold ${tx.amount < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {tx.amount < 0 ? `-₹${Math.abs(tx.amount).toLocaleString('en-IN')}` : `+₹${Math.abs(tx.amount).toLocaleString('en-IN')}`}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium text-white scale-90 ${tx.category.color}`}>
                      {tx.category.label}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
        <AnimatePresence>
          {showLoadMore && mounted && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-6"
            >
              {isLoadingMore ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-2"
                >
                  <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Updating...</span>
                </motion.div>
              ) : (
                <button
                  onClick={handleLoadMore}
                  className="group flex items-center gap-2 px-6 py-2 text-emerald-500 text-sm font-bold hover:text-emerald-400 transition-all duration-300 active:scale-90"
                >
                  Load More Transactions
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ManualTransactionModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
    </>
  );
}
