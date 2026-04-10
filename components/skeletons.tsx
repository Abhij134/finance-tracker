import React from 'react';

// Shimmer animation via CSS class — applied to all skeleton items
// .skeleton-shimmer is defined in globals.css

const Shimmer = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <div style={style} className={`relative overflow-hidden bg-white/[0.04] rounded after:absolute after:inset-0 after:translate-x-[-100%] after:bg-gradient-to-r after:from-transparent after:via-white/[0.06] after:to-transparent after:animate-[shimmer_1.6s_ease-in-out_infinite] ${className ?? ''}`} />
);

export const StatCardSkeleton = () => (
    <div className="relative rounded-2xl border border-border bg-card shadow-lg p-5 h-full min-h-[170px]">
        <div className="flex items-center justify-between">
            <Shimmer className="h-3 w-20 rounded" />
            <Shimmer className="h-8 w-8 rounded-lg" />
        </div>
        <Shimmer className="h-9 w-32 rounded mt-3" />
        <Shimmer className="h-3 w-24 rounded mt-2" />
        <div className="mt-auto pt-3">
            <div className="flex items-end gap-[3px] h-9 mt-1">
                {[...Array(7)].map((_, i) => (
                    <Shimmer
                        key={i}
                        className="flex-1 rounded-sm"
                        style={{ height: `${40 + (i * 8) % 60}%` } as React.CSSProperties}
                    />
                ))}
            </div>
        </div>
    </div>
);

export const GreetingHeaderSkeleton = () => (
    <div className="flex flex-col gap-2 py-1">
        <Shimmer className="h-7 w-52 rounded-lg" />
        <Shimmer className="h-4 w-36 rounded" />
    </div>
);

export const RecentTransactionsSkeleton = () => (
    <div className="rounded-xl border border-border bg-card shadow-md">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <Shimmer className="h-5 w-40 rounded" />
            <Shimmer className="h-8 w-32 rounded-lg" />
        </div>
        <div className="p-4 space-y-4">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="flex justify-between items-center gap-3">
                    <Shimmer className="h-4 w-16 rounded" />
                    <Shimmer className="h-4 w-28 rounded flex-1" />
                    <Shimmer className="h-6 w-20 rounded-full" />
                    <Shimmer className="h-4 w-14 rounded" />
                </div>
            ))}
        </div>
    </div>
);

export const AiInsightsSkeleton = () => (
    <div className="rounded-xl border border-border bg-card shadow-lg p-5 flex flex-col min-h-[280px]">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
            <Shimmer className="h-5 w-36 rounded" />
            <Shimmer className="h-6 w-14 rounded-full" />
        </div>
        <div className="flex-1 space-y-4">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 rounded-xl border border-border bg-white/[0.02] flex gap-4">
                    <Shimmer className="h-10 w-10 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Shimmer className="h-3 w-24 rounded" />
                        <Shimmer className="h-4 w-full rounded" />
                        <Shimmer className="h-3 w-3/4 rounded" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);
