import {
    StatCardSkeleton,
    RecentTransactionsSkeleton,
    AiInsightsSkeleton,
    GreetingHeaderSkeleton
} from "@/components/skeletons";
import { NavbarSkeleton } from "@/components/navbar-skeleton";

export default function Loading() {
    return (
        <div className="bg-background text-foreground min-h-screen">
            <nav className="sticky top-0 z-50 w-full border-b border-border bg-[#0B0F19]/80 backdrop-blur-xl">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-emerald-500/10 rounded-lg animate-pulse" />
                        <div className="h-6 w-32 bg-white/[0.04] rounded-md animate-pulse" />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-white/[0.04] rounded-full animate-pulse" />
                        <div className="h-9 w-9 bg-white/[0.04] rounded-full animate-pulse" />
                    </div>
                </div>
            </nav>

            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
                <GreetingHeaderSkeleton />

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-6">
                    {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
                </div>

                <AiInsightsSkeleton />

                <RecentTransactionsSkeleton />
            </main>
        </div>
    );
}
