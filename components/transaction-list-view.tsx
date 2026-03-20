"use client";

import { useState, useMemo, useTransition, useEffect, Fragment } from "react";
import { PenLine, Cpu, FilterX, Search, Trash2, Loader2, CheckSquare, CalendarDays, ChevronDown } from "lucide-react";
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
    const [displayLimit, setDisplayLimit] = useState(10);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

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

    const paginatedTransactions = useMemo(() => {
        return filteredTransactions.slice(0, displayLimit);
    }, [filteredTransactions, displayLimit]);

    const handleLoadMore = () => {
        setIsLoadingMore(true);
        setTimeout(() => {
            setDisplayLimit(prev => prev + 10);
            setIsLoadingMore(false);
        }, 600);
    };

    const hasMore = false; // Showing all by default on this page

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
                <div className="flex-1 min-w-[200px] w-full space-y-1.5">
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

                <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:gap-4">
                    <div className="space-y-1 mt-1 sm:mt-0">
                        <label className="text-xs text-muted-foreground mb-1 block">From</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>

                    <div className="space-y-1 mt-1 sm:mt-0">
                        <label className="text-xs text-muted-foreground mb-1 block">To</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>

                {(startDate || endDate || searchQuery) && (
                    <button
                        onClick={clearFilters}
                        className="px-4 py-2 flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-md text-sm font-medium transition-colors h-[38px] w-full sm:w-auto justify-center"
                    >
                        <FilterX className="h-4 w-4" />
                        Clear
                    </button>
                )}

                {/* Select Transaction Button area */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {isSelectionMode && (
                        <button
                            onClick={handleSelectAll}
                            className="px-4 py-2 flex items-center gap-2 border rounded-md text-sm font-medium transition-colors h-[38px] bg-muted hover:bg-muted/80 text-foreground border-border w-full justify-center"
                        >
                            {filteredTransactions.length > 0 && selectedIds.size === filteredTransactions.length ? "Deselect All" : "Select All"}
                        </button>
                    )}
                    <button
                        onClick={toggleSelectionMode}
                        className={`px-4 py-2 flex items-center gap-2 border rounded-md text-sm font-medium transition-colors h-[38px] w-full sm:w-auto justify-center ${isSelectionMode
                            ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/30"
                            : "bg-background text-foreground border-border hover:bg-muted"
                            }`}
                    >
                        <CheckSquare className="h-4 w-4" />
                        {isSelectionMode ? "Cancel Selection" : "Select Transactions"}
                    </button>
                </div>
            </div>

            <div className="hidden sm:block pr-2 rounded-xl border border-border bg-card text-card-foreground shadow-md relative w-full overflow-hidden">
                <table className="min-w-full border-separate border-spacing-0 desktop-table">
                    <thead className="text-left text-sm bg-muted/30">
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

            {/* Mobile View Card List - Separate from Table */}
            <div className="sm:hidden space-y-3">
                {filteredTransactions.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground bg-card rounded-xl border border-border">
                        No transactions found matching your filters.
                    </div>
                ) : (
                    filteredTransactions.map((tx) => {
                        const isSelected = selectedIds.has(tx.id);
                        return (
                            <div
                                key={tx.id}
                                onClick={() => isSelectionMode && toggleSelect(tx.id)}
                                className={`flex items-center justify-between px-4 py-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm transition-all ${isSelected ? "ring-2 ring-emerald-500 bg-emerald-500/10 border-emerald-500/30" : "active:scale-[0.98]"}`}
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    {isSelectionMode && (
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleSelect(tx.id)}
                                            className="rounded border-border accent-emerald-500 h-5 w-5 shrink-0"
                                        />
                                    )}
                                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                                        <span className="text-sm font-semibold text-foreground truncate">
                                            {tx.merchant}
                                        </span>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                                {mounted ? format(new Date(tx.date), 'dd MMM yyyy') : '...'}
                                            </span>
                                            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-tighter ${tx.category.color}`}>
                                                {tx.category.label}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                                    <span className={`text-sm font-bold ${tx.amount < 0 ? "text-red-400" : "text-emerald-400"}`}>
                                        {formatAmount(tx.amount)}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded border border-border/50">
                                        {tx.method === "manual" ? "Manual" : "AI"}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Floating Action Bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col sm:flex-row items-center gap-2 sm:gap-4 rounded-2xl border border-emerald-500/30 bg-[#0d1117]/90 backdrop-blur-2xl p-2.5 sm:p-3 shadow-[0_8px_40px_rgba(0,0,0,0.5),0_0_20px_rgba(16,185,129,0.1)] animate-in slide-in-from-bottom-5 w-[calc(100vw-1.5rem)] sm:w-auto max-w-4xl border-t-emerald-400/20">

                    {/* Status Section */}
                    <div className="flex items-center justify-between w-full sm:w-auto gap-2 px-1 sm:px-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <CheckSquare className="h-4 w-4 text-emerald-400 shrink-0" />
                            <span className="text-sm font-bold text-emerald-50 whitespace-nowrap overflow-hidden text-ellipsis px-1 bg-white/5 rounded">
                                {selectedIds.size}
                            </span>
                        </div>
                        <div className="sm:hidden h-5 w-px bg-white/10" />
                        <button
                            onClick={handleBulkDelete}
                            disabled={isPending}
                            className="sm:hidden flex items-center justify-center p-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 active:scale-95 transition-all"
                            title="Delete Selected"
                        >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                    </div>

                    <div className="hidden sm:block h-6 w-px bg-emerald-500/30" />
                    <div className="sm:hidden w-full h-[0.5px] bg-white/10" />

                    {/* Actions Section */}
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                        <div className="relative flex items-center flex-1 sm:flex-none h-10 bg-white/5 border border-white/10 rounded-xl px-2 group focus-within:border-blue-500/50 transition-colors">
                            <CalendarDays className="h-4 w-4 text-blue-400 shrink-0 mr-1.5" />
                            <input
                                type="date"
                                onChange={(e) => handleBulkEditDate(e.target.value)}
                                disabled={isPending}
                                className="bg-transparent text-sm text-blue-50 focus:outline-none cursor-pointer w-full"
                                title="Change date for selected"
                            />
                        </div>

                        <div className="relative flex-[1.2] sm:flex-none min-w-0">
                            <select
                                className="w-full sm:min-w-[160px] h-10 bg-white/5 border border-white/10 rounded-xl px-2.5 text-sm text-emerald-50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 cursor-pointer appearance-none transition-all pr-7 truncate"
                                onChange={(e) => handleBulkEditCategory(e.target.value)}
                                disabled={isPending}
                                defaultValue=""
                            >
                                <option value="" disabled className="bg-[#0b141e] text-gray-500">Edit Category...</option>
                                {CATEGORIES.map(c => <option className="bg-[#0b141e] text-white" key={c.label} value={c.label}>{c.label}</option>)}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-400/50">
                                <ChevronDown className="h-3.5 w-3.5" />
                            </div>
                        </div>

                        <button
                            onClick={handleBulkDelete}
                            disabled={isPending}
                            className="hidden sm:flex items-center gap-2 rounded-xl bg-red-500/10 px-4 h-10 text-sm font-bold text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all border border-red-500/20 disabled:opacity-50"
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