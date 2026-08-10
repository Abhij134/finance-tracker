import { TransactionListView } from "@/components/transaction-list-view";
import { getTransactions } from "@/app/actions/transactions";
import { CATEGORIES } from "@/lib/constants";

export default async function AllTransactionsPage() {
  const result = await getTransactions({ limit: 20, offset: 0 });
  const rawTxs = Array.isArray(result) ? result : result.transactions || [];
  const totalPages = Array.isArray(result) ? 1 : result.totalPages || 1;
  const totalCount = Array.isArray(result) ? rawTxs.length : result.totalCount || rawTxs.length;

  // Map to UI Type Format
  const txs = rawTxs.map((d: any) => ({
    id: d.id,
    date: new Date(d.date).toISOString(),
    merchant: d.merchant,
    category: CATEGORIES.find(c => c.label === d.category) || CATEGORIES.find(c => c.label === "Other") || CATEGORIES[0],
    method: (d.isAiScanned ? "ai" : "manual") as "manual" | "ai",
    amount: d.amount,
  }));

  return (
    <div className="px-3 sm:px-6 lg:px-8 pt-8 pb-3 sm:py-6 space-y-4 sm:space-y-6">
      <div className="mb-3 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          All Transactions
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          View and manage all your historical transactions.
        </p>
      </div>
      <TransactionListView initialTransactions={txs} totalPages={totalPages} totalCount={totalCount} />
    </div>
  );
}
