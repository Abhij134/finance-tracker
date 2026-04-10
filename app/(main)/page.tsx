import { ActionCenter } from "@/components/action-center";
import { RecentTransactions } from "@/components/recent-transactions";
import { AiLiveInsights } from "@/components/ai-live-insights";
import { Navbar } from "@/components/navbar";
import { StatCards } from "@/components/stat-cards";
import { TransactionsProvider, DatePreset } from "@/app/(main)/transactions-context";
import { BudgetProvider } from "@/app/(main)/budget-context";
import { CATEGORIES } from "@/lib/constants";
import { getTransactions } from "@/app/actions/transactions";
import { getBudgets } from "@/app/actions/budgets";
import { GreetingHeader } from "@/components/greeting-header";
import { getUserProfile } from "@/app/actions/auth";
import { Suspense } from "react";
import { StatCardSkeleton, RecentTransactionsSkeleton, AiInsightsSkeleton, GreetingHeaderSkeleton } from "@/components/skeletons";
import { toLocalISO, getLocalStartOfDay, getLocalEndOfDay } from "@/lib/utils";

function deriveDateRange(range: string, fromParam?: string, toParam?: string) {
  const now = new Date();
  let from: Date | null = null;
  let to: Date | null = getLocalEndOfDay(now);

  if (range === "custom") {
    from = fromParam ? getLocalStartOfDay(new Date(fromParam)) : null;
    to = toParam ? getLocalEndOfDay(new Date(toParam)) : null;
  } else if (fromParam && toParam) {
    from = getLocalStartOfDay(new Date(fromParam));
    to = getLocalEndOfDay(new Date(toParam));
  } else {
    switch (range) {
      case "7d":
        from = getLocalStartOfDay(new Date(now.setDate(now.getDate() - 6)));
        break;
      case "month":
        from = getLocalStartOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
        break;
      case "all":
        from = new Date(0);
        break;
      case "30d":
      default:
        from = getLocalStartOfDay(new Date(now.setDate(now.getDate() - 29)));
        break;
    }
  }
  return { from, to };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const rangeParam = (params.range as string) || "month";
  const preset = (
    ["all", "7d", "30d", "month", "custom"].includes(rangeParam) ? rangeParam : "month"
  ) as DatePreset;
  const { from, to } = deriveDateRange(preset, params.from as string, params.to as string);

  const profileResponse = await getUserProfile();
  const dbUser = profileResponse.success && profileResponse.user ? profileResponse.user : null;
  const userName = dbUser?.username || "Guest";
  const userEmail = dbUser?.email || "";
  const userBirthdate = dbUser?.birthdate ? new Date(dbUser.birthdate).toISOString() : undefined;
  const userImage = dbUser?.image || undefined;

  const [dbTransactions, dbBudgets] = await Promise.all([
    getTransactions(),
    getBudgets(),
  ]);

  const txs = dbTransactions.map((d: any) => {
    const dateObj = new Date(d.date);
    return {
      id: d.id,
      date: dateObj.toISOString(),
      merchant: d.merchant,
      category: CATEGORIES.find(c => c.label === d.category) || CATEGORIES.find(c => c.label === "Other") || CATEGORIES[0],
      method: (d.isAiScanned ? "ai" : "manual") as "manual" | "ai",
      amount: d.amount,
    };
  });

  const budgets = dbBudgets.map((b: any) => ({
    id: b.id,
    category: b.category,
    amount: b.amount,
  }));

  const initialFilter = {
    preset,
    range: { from: from ? toLocalISO(from) : "", to: to ? toLocalISO(to) : "" },
  };

  return (
    <div className="bg-background text-foreground">
      <Navbar userName={userName} userEmail={userEmail} userBirthdate={userBirthdate} userImage={userImage} />
      <TransactionsProvider initialTransactions={txs} initialFilter={initialFilter}>
        <BudgetProvider initialBudgets={budgets}>
          <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">

            <Suspense fallback={<GreetingHeaderSkeleton />}>
              <GreetingHeader userName={userName} />
            </Suspense>

            <Suspense fallback={
              <div className="grid grid-cols-2 gap-2.5">
                {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
              </div>
            }>
              <StatCards />
            </Suspense>

            <Suspense fallback={<AiInsightsSkeleton />}>
              <AiLiveInsights
                range={preset}
                from={from ? toLocalISO(from) : ""}
                to={to ? toLocalISO(to) : ""}
              />
            </Suspense>

            <ActionCenter />

            <Suspense fallback={<RecentTransactionsSkeleton />}>
              <RecentTransactions />
            </Suspense>

          </main>
        </BudgetProvider>
      </TransactionsProvider>
    </div>
  );
}