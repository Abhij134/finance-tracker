"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { PenLine, Cpu, FilterX, Search, Trash2, Loader2, CheckSquare, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { deleteBulkTransactions, updateBulkTransactionsCategory, updateBulkTransactionsDate } from "@/app/actions/transactions";
import { CATEGORIES } from "@/lib/constants";

type Tx = {
    id: string;
    date: string;
    merchant: string;
    category: { label: string; color: string };
    method: "manual" | "ai";
    amount: number;
};

export function TransactionListView({ initialTransactions }: { initialTransactions: Tx[] }) {
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState<string>("");

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const filteredTransactions = useMemo(() => {
        return initialTransactions.filter((tx) => {
            // 1. Text Search Map
            const searchMatch =
                !searchQuery ||
                tx.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tx.category.label.toLowerCase().includes(searchQuery.toLowerCase());

            // 2. Date Range Map
            const afterStart = !startDate || tx.date >= startDate;
            const beforeEnd = !endDate || tx.date <= endDate;

            return searchMatch && afterStart && beforeEnd;
        });
    }, [initialTransactions, startDate, endDate, searchQuery]);

    function formatAmount(n: number) {
        const f = Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Math.abs(n));
        return n < 0 ? `-${f}` : `+${f}`;
    }

    const clearFilters = () => {
        setStartDate("");
        setEndDate("");
        setSearchQuery("");
        setSelectedIds(new Set());
        setIsSelectionMode(false);
    }

    const toggleSelectionMode = () => {
        if (isSelectionMode) {
            setSelectedIds(new Set()); // Clear selections if exiting mode
        }
        setIsSelectionMode(!isSelectionMode);
    }

    // Kept for convenience if they want a master toggle later, though UI removed it
    const handleSelectAll = () => {
        if (filteredTransactions.length > 0 && selectedIds.size === filteredTransactions.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredTransactions.map(t => t.id)));
        }
    }

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    }

    const handleBulkDelete = () => {
        if (!confirm(`Are you sure you want to delete ${selectedIds.size} transactions?`)) return;
        startTransition(async () => {
            await deleteBulkTransactions(Array.from(selectedIds));
            setSelectedIds(new Set());
        });
    }

    const handleBulkEditCategory = (newCat: string) => {
        if (!newCat) return;
        startTransition(async () => {
            await updateBulkTransactionsCategory(Array.from(selectedIds), newCat);
            setSelectedIds(new Set());
        });
    }

    const handleBulkEditDate = (newDate: string) => {
        if (!newDate) return;
        startTransition(async () => {
            await updateBulkTransactionsDate(Array.from(selectedIds), newDate);
            setSelectedIds(new Set());
        });
    }

    return (
        <div className="space-y-6">
            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-end bg-card p-4 rounded-xl border border-border shadow-sm">
                <div className="flex-1 min-w-[200px] space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Search</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search merchants or categories..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">From Date</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">To Date</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>

                {(startDate || endDate || searchQuery) && (
                    <button
                        onClick={clearFilters}
                        className="px-4 py-2 flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-md text-sm font-medium transition-colors h-[38px]"
                    >
                        <FilterX className="h-4 w-4" />
                        Clear
                    </button>
                )}

                {/* Select Transaction Button area */}
                <div className="flex items-center gap-2">
                    {isSelectionMode && (
                        <button
                            onClick={handleSelectAll}
                            className="px-4 py-2 flex items-center gap-2 border rounded-md text-sm font-medium transition-colors h-[38px] bg-muted hover:bg-muted/80 text-foreground border-border"
                        >
                            {filteredTransactions.length > 0 && selectedIds.size === filteredTransactions.length ? "Deselect All" : "Select All"}
                        </button>
                    )}
                    <button
                        onClick={toggleSelectionMode}
                        className={`px-4 py-2 flex items-center gap-2 border rounded-md text-sm font-medium transition-colors h-[38px] ${isSelectionMode
                            ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/30"
                            : "bg-background text-foreground border-border hover:bg-muted"
                            }`}
                    >
                        <CheckSquare className="h-4 w-4" />
                        {isSelectionMode ? "Cancel Selection" : "Select Transactions"}
                    </button>
                </div>
            </div>

            {/* Table Section */}
            <div className="max-h-[700px] overflow-y-auto custom-scrollbar pr-2 rounded-xl border border-border bg-card text-card-foreground shadow-md overflow-x-auto relative">
                <table className="min-w-full border-separate border-spacing-0">
                    <thead>
                        <tr className="text-left text-sm bg-muted/30">
                            {isSelectionMode && (
                                <th className="sticky left-0 bg-card/95 backdrop-blur px-4 py-3 border-b border-border font-semibold w-12 text-center align-middle" />
                            )}
                            <th className="px-4 py-3 border-b border-border font-semibold align-middle">Date</th>
                            <th className="px-4 py-3 border-b border-border font-semibold align-middle">Merchant</th>
                            <th className="px-4 py-3 border-b border-border font-semibold align-middle">
                                <span className="pl-1.5">Category</span>
                            </th>
                            <th className="px-4 py-3 border-b border-border font-semibold align-middle">
                                <span className="pl-1.5">Method</span>
                            </th>
                            <th className="px-4 py-3 border-b border-border text-right font-semibold align-middle">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.length === 0 ? (
                            <tr>
                                <td colSpan={isSelectionMode ? 6 : 5} className="px-4 py-8 text-center text-muted-foreground">
                                    No transactions found matching your filters.
                                </td>
                            </tr>
                        ) : (
                            filteredTransactions.map((tx) => {
                                const isSelected = selectedIds.has(tx.id);
                                return (
                                    <tr key={tx.id} className={`text-sm transition-colors ${isSelected ? "bg-emerald-500/10" : "hover:bg-muted/50"}`}>
                                        {isSelectionMode && (
                                            <td className={`sticky left-0 border-b border-border px-4 py-3 text-center align-middle ${isSelected ? "bg-emerald-950/20" : "bg-card/95"} backdrop-blur`}>
                                                <div className="flex items-center justify-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSelect(tx.id)}
                                                        className="rounded border-border accent-emerald-500 h-4 w-4 cursor-pointer"
                                                    />
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-4 py-3 border-b border-border whitespace-nowrap align-middle">
                                            {mounted ? format(new Date(tx.date), 'dd MMM yyyy, hh:mm a') : '...'}
                                        </td>
                                        <td className="px-4 py-3 border-b border-border font-medium align-middle">{tx.merchant}</td>
                                        <td className="px-4 py-3 border-b border-border align-middle">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white ${tx.category.color}`}>
                                                {tx.category.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 border-b border-border align-middle">
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                                {tx.method === "manual" ? <PenLine className="h-3 w-3" /> : <Cpu className="h-3 w-3 text-primary" />}
                                                <span>{tx.method === "manual" ? "Manual" : "AI Scanned"}</span>
                                            </span>
                                        </td>
                                        <td className={`px-4 py-3 border-b border-border text-right font-semibold align-middle ${tx.amount < 0 ? "text-foreground" : "text-emerald-500"}`}>
                                            {formatAmount(tx.amount)}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Floating Action Bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 rounded-xl border border-emerald-500/30 bg-black/80 backdrop-blur-xl p-3 shadow-[0_8px_32px_0_rgba(16,185,129,0.2)] animate-in slide-in-from-bottom-5">
                    <span className="text-sm font-medium text-emerald-50 px-2 flex items-center gap-1.5">
                        <CheckSquare className="h-4 w-4 text-emerald-400" />
                        {selectedIds.size} selected
                    </span>
                    <div className="h-6 w-px bg-emerald-500/30" />

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                            <CalendarDays className="h-4 w-4 text-blue-400" />
                            <input
                                type="date"
                                onChange={(e) => handleBulkEditDate(e.target.value)}
                                disabled={isPending}
                                className="bg-transparent text-sm text-blue-100 rounded-md border border-blue-500/40 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                title="Change date for selected"
                            />
                        </div>

                        <select
                            className="bg-transparent text-sm text-emerald-100 rounded-md border border-emerald-500/40 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer min-w-[140px]"
                            onChange={(e) => handleBulkEditCategory(e.target.value)}
                            disabled={isPending}
                            defaultValue=""
                        >
                            <option value="" disabled className="bg-black text-gray-400">Edit Category...</option>
                            {CATEGORIES.map(c => <option className="bg-black text-white" key={c.label} value={c.label}>{c.label}</option>)}
                        </select>

                        <button
                            onClick={handleBulkDelete}
                            disabled={isPending}
                            className="flex items-center gap-1.5 rounded-lg bg-red-500/20 px-4 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/30 hover:text-white transition-colors border border-red-500/30 disabled:opacity-50"
                        >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            Delete
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}