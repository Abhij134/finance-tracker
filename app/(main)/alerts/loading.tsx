export default function Loading() {
    return (
        <div className="bg-background text-foreground min-h-screen">
            <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 w-full max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        Alerts & Notifications
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage how FinanceNeo keeps you informed about your finances.
                    </p>
                </div>

                <div className="space-y-8">
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-5 w-5 bg-emerald-500/10 rounded animate-pulse" />
                            <div className="h-6 w-48 bg-white/[0.04] rounded animate-pulse" />
                        </div>
                        <div className="rounded-xl shadow-md overflow-hidden h-[72px] bg-card border border-border animate-pulse" />
                    </section>

                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-5 w-5 bg-emerald-500/10 rounded animate-pulse" />
                            <div className="h-6 w-32 bg-white/[0.04] rounded animate-pulse" />
                        </div>
                        <div className="rounded-xl border border-border bg-card shadow-md h-[400px] animate-pulse" />
                    </section>
                </div>
            </main>
        </div>
    );
}
