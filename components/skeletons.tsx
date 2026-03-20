import React from 'react';

export const StatCardSkeleton = () => (
    <div className="relative rounded-2xl border border-border bg-card shadow-lg p-5 h-full min-h-[170px] animate-pulse">
        <div className="flex items-center justify-between">
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-8 w-8 bg-muted rounded-lg" />
        </div>
        <div className="h-10 w-32 bg-muted rounded mt-3" />
        <div className="h-4 w-24 bg-muted rounded mt-2" />
        <div className="mt-auto pt-3">
            <div className="flex items-end gap-[3px] h-9 mt-1">
                {[...Array(7)].map((_, i) => (
                    <div key={i} className="flex-1 h-full bg-muted rounded-sm" style={{ height: `${Math.random() * 80 + 20}%` }} />
                ))}
            </div>
        </div>
    </div>
);

export const RecentTransactionsSkeleton = () => (
    <div className="rounded-xl border border-border bg-card shadow-md animate-pulse">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="h-5 w-40 bg-muted rounded" />
            <div className="h-8 w-32 bg-muted rounded-lg" />
        </div>
        <div className="p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                    <div className="h-4 w-20 bg-muted rounded" />
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-6 w-24 bg-muted rounded-full" />
                    <div className="h-4 w-16 bg-muted rounded" />
                </div>
            ))}
        </div>
    </div>
);

export const AiInsightsSkeleton = () => (
    <div className="rounded-xl border border-border bg-card shadow-lg p-5 h-full min-h-[400px] flex flex-col animate-pulse">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
            <div className="h-5 w-32 bg-muted rounded" />
            <div className="h-6 w-12 bg-muted rounded-full" />
        </div>
        <div className="flex-1 space-y-4">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 rounded-xl border border-border bg-muted/20 flex gap-4">
                    <div className="h-10 w-10 bg-muted rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 w-24 bg-muted rounded" />
                        <div className="h-4 w-full bg-muted rounded" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);
