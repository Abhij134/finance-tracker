import { FinancialReportsDashboard } from "@/components/financial-reports-dashboard";
import { TransactionsProvider } from "@/app/(main)/transactions-context";
import { BudgetProvider } from "@/app/(main)/budget-context";
import { getTransactions } from "@/app/actions/transactions";
import { getBudgets } from "@/app/actions/budgets";
import { CATEGORIES } from "@/lib/constants";

export default async function BudgetPage() {
  const [dbTransactions, dbBudgets] = await Promise.all([
    getTransactions(),
    getBudgets(),
  ]);

  const txs = dbTransactions.map((d: any) => ({
    id: d.id,
    date: new Date(d.date).toISOString(),
    merchant: d.merchant,
    category: CATEGORIES.find(c => c.label === d.category) || CATEGORIES.find(c => c.label === "Other") || CATEGORIES[0],
    method: (d.isAiScanned ? "ai" : "manual") as "manual" | "ai",
    amount: d.amount
  }));

  const budgets = dbBudgets.map((b: any) => ({
    id: b.id,
    category: b.category,
    amount: b.amount,
  }));

  return (
    <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
      <TransactionsProvider initialTransactions={txs}>
        <BudgetProvider initialBudgets={budgets}>
          <FinancialReportsDashboard />
        </BudgetProvider>
      </TransactionsProvider>
    </main>
  );
}