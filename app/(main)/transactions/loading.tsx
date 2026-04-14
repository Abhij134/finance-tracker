import { RecentTransactionsSkeleton } from "@/components/skeletons";

export default function Loading() {
    return (
        <div className="bg-background text-foreground min-h-screen">
            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        All Transactions
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        View and manage all your historical transactions.
                    </p>
                </div>

                {/* Search / Filter Bar Placeholder */}
                <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
                    <div className="h-10 w-full sm:w-64 bg-white/[0.04] rounded-lg animate-pulse" />
                    <div className="h-10 w-full sm:w-32 bg-white/[0.04] rounded-lg animate-pulse" />
                </div>

                <RecentTransactionsSkeleton />
                <div className="mt-4">
                    <RecentTransactionsSkeleton />
                </div>
            </main>
        </div>
    );
}
