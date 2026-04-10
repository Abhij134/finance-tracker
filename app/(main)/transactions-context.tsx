"use client";
import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { addTransaction as saAddTransaction, deleteTransaction as saDeleteTransaction, addBulkTransactions as saAddBulkTransactions, updateTransaction as saUpdateTransaction, getTransactions as saGetTransactions } from "@/app/actions/transactions";
import { toLocalISO, normalizeDate } from "@/lib/utils";

export type Tx = {
    id: string; // Changed to string (UUID) from DB
    date: string;
    merchant: string;
    category: { label: string; color: string };
    method: "manual" | "ai";
    amount: number;
    referenceId?: string | null;
};

export type DatePreset = "all" | "7d" | "30d" | "month" | "custom";
export type DateRange = { from: string; to: string };

import { CATEGORIES } from "@/lib/constants";

type TxContextType = {
    transactions: Tx[];
    addTransaction: (tx: Omit<Tx, "id">) => Promise<void>;
    addBulkTransactions: (txs: Omit<Tx, "id">[]) => Promise<{ success: boolean; addedCount: number }>;
    updateTransaction: (tx: Tx) => Promise<void>;
    deleteTransaction: (id: string) => Promise<void>;
    loadMore: () => Promise<void>;
    setStartDate: (date: Date | null) => void;
    dateFilter: { preset: DatePreset; range: DateRange };
    setDateFilter: (filter: { preset: DatePreset; range: DateRange }) => void;
    isLoadingMore: boolean;
    hasMore: boolean;
    isAddModalOpen: boolean;
    openAddModal: () => void;
    closeAddModal: () => void;
};

const TxContext = createContext<TxContextType | null>(null);

export function TransactionsProvider({
    children,
    initialTransactions,
    initialFilter
}: {
    children: ReactNode,
    initialTransactions: Tx[],
    initialFilter?: { preset: DatePreset; range: DateRange }
}) {
    const getPresetRange = useCallback((preset: DatePreset): DateRange => {
        const today = new Date();
        const to = toLocalISO(today);
        switch (preset) {
            case "7d": {
                const from = new Date(today);
                from.setDate(from.getDate() - 6);
                return { from: toLocalISO(from), to };
            }
            case "30d": {
                const from = new Date(today);
                from.setDate(from.getDate() - 29);
                return { from: toLocalISO(from), to };
            }
            case "month": {
                const from = new Date(today.getFullYear(), today.getMonth(), 1);
                return { from: toLocalISO(from), to };
            }
            default:
                return { from: "", to: "" };
        }
    }, []);

    // We hold the server-provided transactions in state so we can optimistically update them
    const [transactions, setTransactions] = useState<Tx[]>(initialTransactions);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [offset, setOffset] = useState(initialTransactions.length);
    const [hasMore, setHasMore] = useState(initialTransactions.length === 2000);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Initialize filter from initialFilter prop if available
    const [dateFilter, setDateFilter] = useState<{ preset: DatePreset; range: DateRange }>(() => {
        if (initialFilter) return initialFilter;
        const today = new Date();
        const to = toLocalISO(today);
        const from = toLocalISO(new Date(today.getFullYear(), today.getMonth(), 1));
        return { preset: "month", range: { from, to } };
    });

    const [startDate, setStartDateState] = useState<Date | null>(null);

    const mapDbTransactions = useCallback((dbTransactions: any[]): Tx[] => {
        return dbTransactions.map((d: any) => {
            const dateStr = typeof d.date === 'string' ? d.date : d.date instanceof Date ? d.date.toISOString() : "";
            return {
                id: d.id,
                date: dateStr,
                merchant: d.merchant,
                category: CATEGORIES.find(c => c.label === d.category) || CATEGORIES.find(c => c.label === "Other") || CATEGORIES[0],
                method: (d.isAiScanned ? "ai" : "manual") as "manual" | "ai",
                amount: d.amount
            };
        });
    }, []);

    // Sync state if initialTransactions changes from a Server revalidation
    useEffect(() => {
        setTransactions(initialTransactions);
        setOffset(initialTransactions.length);
        setHasMore(initialTransactions.length === 2000);
    }, [initialTransactions]);

    // Sync dateFilter if initialFilter changes (URL updates)
    useEffect(() => {
        if (initialFilter) {
            setDateFilter(initialFilter);
        }
    }, [initialFilter]);

    const setStartDate = useCallback((date: Date | null) => {
        setStartDateState(date);
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function refreshByFilter() {
            setIsLoadingMore(true);
            try {
                const refreshed = await saGetTransactions({
                    limit: 2000,
                    offset: 0,
                });

                if (cancelled) return;
                const formatted = mapDbTransactions(refreshed);
                setTransactions(formatted);
                setOffset(formatted.length);
                setHasMore(formatted.length === 2000);
            } catch (e) {
                console.error("Failed to refresh transactions by period:", e);
                // Keep existing transactions on error instead of clearing them
            } finally {
                if (!cancelled) setIsLoadingMore(false);
            }
        }

        refreshByFilter();

        return () => {
            cancelled = true;
        };
    }, [mapDbTransactions]); // Only refresh on mount or if transactions change on server

    const loadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore) return;
        setIsLoadingMore(true);

        try {
            const nextTxs = await saGetTransactions({
                limit: 2000,
                offset,
            });
            const formatted = mapDbTransactions(nextTxs);

            if (formatted.length < 2000) {
                setHasMore(false);
            }

            setTransactions(prev => [...prev, ...formatted]);
            setOffset(prev => prev + formatted.length);
        } catch (e) {
            console.error("Failed to load more transactions:", e);
        } finally {
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, hasMore, offset, startDate, mapDbTransactions]);

    const addTransaction = useCallback(async (tx: Omit<Tx, "id">) => {
        // Optimistic update
        const tempId = Math.random().toString();
        setTransactions((prev) => [{ ...tx, id: tempId }, ...prev]);

        // Call server action
        await saAddTransaction({
            merchant: tx.merchant,
            amount: tx.amount,
            category: tx.category.label,
            method: tx.method,
            date: tx.date,
        });
        // revalidatePath in action will trigger a refresh and replace our temp state
    }, []);

    const addBulkTransactions = useCallback(async (txs: Omit<Tx, "id">[]) => {
        // Optimistic update
        const tempTxs = txs.map(tx => ({ ...tx, id: Math.random().toString() }));
        setTransactions((prev) => [...tempTxs, ...prev]);

        // Call server action
        const response = await saAddBulkTransactions(txs.map(tx => ({
            merchant: tx.merchant,
            amount: tx.amount,
            category: tx.category.label,
            method: tx.method,
            date: tx.date,
        })));
        return response;
    }, []);

    const updateTransaction = useCallback(async (updated: Tx) => {
        setTransactions((prev) =>
            prev.map((t) => (t.id === updated.id ? updated : t))
        );
        // Persist to server
        await saUpdateTransaction(updated.id, {
            merchant: updated.merchant,
            amount: updated.amount,
            category: updated.category.label,
            method: updated.method,
            date: updated.date,
        });
    }, []);

    const deleteTransaction = useCallback(async (id: string) => {
        // Optimistic update
        setTransactions((prev) => prev.filter((t) => t.id !== id));

        // Call server action
        await saDeleteTransaction(id);
        // revalidatePath in action will trigger a refresh
    }, []);

    return (
        <TxContext.Provider
            value={{
                transactions,
                addTransaction,
                addBulkTransactions,
                updateTransaction,
                deleteTransaction,
                loadMore,
                setStartDate,
                dateFilter,
                setDateFilter,
                isLoadingMore,
                hasMore,
                isAddModalOpen,
                openAddModal: () => setIsAddModalOpen(true),
                closeAddModal: () => setIsAddModalOpen(false),
            }}
        >
            {children}
        </TxContext.Provider>
    );
}

export function useTransactions() {
    const ctx = useContext(TxContext);
    if (!ctx) throw new Error("useTransactions must be used within TransactionsProvider");
    return ctx;
}
