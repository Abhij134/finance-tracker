"use client";
import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { setBudget as saSetBudget } from "@/app/actions/budgets";

export type Budget = {
    id: string;
    category: string;
    amount: number;
};

type BudgetContextType = {
    budgets: Budget[];
    updateBudget: (category: string, amount: number) => Promise<void>;
};

const BudgetContext = createContext<BudgetContextType | null>(null);

export function BudgetProvider({ children, initialBudgets }: { children: ReactNode, initialBudgets: Budget[] }) {
    const [budgets, setBudgets] = useState<Budget[]>(initialBudgets);

    // Sync state if initialBudgets changes from a Server revalidation
    useEffect(() => {
        setBudgets(initialBudgets);
    }, [initialBudgets]);

    const updateBudget = useCallback(async (category: string, amount: number) => {
        // Optimistic update
        setBudgets((prev) => {
            const existing = prev.find(b => b.category === category);
            if (existing) {
                return prev.map(b => b.category === category ? { ...b, amount } : b);
            } else {
                return [...prev, { id: "temp", category, amount }];
            }
        });

        // Call server action 
        // This will trigger 'revalidatePath' and refresh our data from the server
        await saSetBudget(category, amount);
    }, []);

    return (
        <BudgetContext.Provider value={{ budgets, updateBudget }}>
            {children}
        </BudgetContext.Provider>
    );
}

export function useBudgets() {
    const ctx = useContext(BudgetContext);
    if (!ctx) throw new Error("useBudgets must be used within BudgetProvider");
    return ctx;
}
