import dynamic from "next/dynamic";
import { ActionCenter } from "@/components/action-center";
import { RecentTransactions } from "@/components/recent-transactions";
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
import { StatCardSkeleton, RecentTransactionsSkeleton, AiInsightsSkeleton, GreetingHeaderSkeleton, ChartSkeleton } from "@/components/skeletons";

const CategoryBreakdown = dynamic(
  () => import("@/components/category-breakdown").then((mod) => mod.CategoryBreakdown),
  {
    loading: () => <ChartSkeleton className="min-h-[320px]" />
  }
);

const AiLiveInsights = dynamic(
  () => import("@/components/ai-live-insights").then((mod) => mod.AiLiveInsights),
  {
    loading: () => <AiInsightsSkeleton />
  }
);
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
        to = getLocalEndOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
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
  const rangeParam = params.range as string | undefined;
  const isDefault = !rangeParam;
  const preset = (
    rangeParam && ["all", "7d", "30d", "month", "custom"].includes(rangeParam) ? rangeParam : "month"
  ) as DatePreset;
  const { from, to } = deriveDateRange(preset, params.from as string, params.to as string);

  // Run all data fetches concurrently — eliminates sequential DB round-trips
  const [profileResponse, transactionsData, dbBudgets] = await Promise.all([
    getUserProfile(),
    getTransactions({ limit: 100 }),
    getBudgets(),
  ]);

  const dbUser = profileResponse.success && profileResponse.user ? profileResponse.user : null;
  const userName = dbUser?.username || "Guest";
  const userEmail = dbUser?.email || "";
  const userBirthdate = dbUser?.birthdate ? new Date(dbUser.birthdate).toISOString() : undefined;
  const userImage = dbUser?.image || undefined;

  const dbTransactions = Array.isArray(transactionsData) ? transactionsData : transactionsData?.transactions || [];

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
    isDefault
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

            {/* Grid structure placing Actions and AI Insights on the left, Category Breakdown on the right */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              <div className="flex flex-col gap-4 sm:gap-6">
                <ActionCenter />
                <div className="flex-1 min-h-[420px] sm:min-h-[480px] lg:min-h-[540px]">
                  <Suspense fallback={<AiInsightsSkeleton />}>
                    <AiLiveInsights
                      range={preset}
                      from={from ? toLocalISO(from) : ""}
                      to={to ? toLocalISO(to) : ""}
                    />
                  </Suspense>
                </div>
              </div>
              <div className="flex flex-col">
                <CategoryBreakdown />
              </div>
            </div>

            <Suspense fallback={<RecentTransactionsSkeleton />}>
              <RecentTransactions />
            </Suspense>

          </main>
        </BudgetProvider>
      </TransactionsProvider>
    </div>
  );
}