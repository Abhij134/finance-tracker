import { TransactionListView } from "@/components/transaction-list-view";
import { getTransactions } from "@/app/actions/transactions";
import { CATEGORIES } from "@/lib/constants";

export default async function AllTransactionsPage() {
  const dbTransactions = await getTransactions();

  // Map to UI Type Format
  const txs = dbTransactions.map((d: any) => ({
    id: d.id,
    date: new Date(d.date).toISOString(),
    merchant: d.merchant,
    category: CATEGORIES.find(c => c.label === d.category) || CATEGORIES.find(c => c.label === "Other") || CATEGORIES[0],
    method: (d.isAiScanned ? "ai" : "manual") as "manual" | "ai",
    amount: d.amount,
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          All Transactions
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          View and manage all your historical transactions.
        </p>
      </div>
      <TransactionListView initialTransactions={txs} />
    </div>
  );
}
