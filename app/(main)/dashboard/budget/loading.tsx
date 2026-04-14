import { ChartSkeleton } from "@/components/skeletons";

export default function Loading() {
    return (
        <div className="bg-background text-foreground min-h-screen">
            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">

                {/* Date Filter Bar Placeholder */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border border-border p-4 rounded-xl shadow-md mb-6">
                    <div className="h-6 w-24 bg-white/[0.04] rounded animate-pulse" />
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <div className="h-10 w-20 bg-white/[0.04] rounded-lg animate-pulse" />
                        <div className="h-10 w-24 bg-emerald-500/10 border border-emerald-500/20 rounded-lg animate-pulse" />
                        <div className="h-10 w-32 bg-white/[0.04] rounded-lg animate-pulse" />
                    </div>
                </div>

                {/* Overview Cards Placeholder */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-8">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-card border border-border p-5 rounded-xl shadow-lg h-[130px] flex flex-col justify-center gap-3">
                            <div className="h-4 w-28 bg-white/[0.04] rounded animate-pulse" />
                            <div className="h-8 w-32 bg-white/[0.06] rounded animate-pulse" />
                        </div>
                    ))}
                </div>

                {/* Main Charts Grid Placeholder */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                    {[...Array(4)].map((_, i) => <ChartSkeleton key={i} />)}
                </div>

            </main>
        </div>
    );
}
