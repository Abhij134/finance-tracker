"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useTransactions } from "@/app/(main)/transactions-context";
import { CATEGORIES } from "@/lib/constants";

type Props = {
    open: boolean;
    onClose: () => void;
};

export function ManualTransactionModal({ open, onClose }: Props) {
    const { addTransaction } = useTransactions();
    const getLocalDefaults = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const date = `${year}-${month}-${day}`;
        const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        return { date, time };
    };

    const [form, setForm] = useState(() => {
        const defaults = getLocalDefaults();
        return {
            date: defaults.date,
            time: defaults.time,
            merchant: "",
            categoryLabel: CATEGORIES[0].label,
            amount: "",
            type: "expense" as "expense" | "income",
        };
    });
    const [error, setError] = useState("");

    // Update form when modal opens
    useEffect(() => {
        if (open) {
            const defaults = getLocalDefaults();
            setForm({
                date: defaults.date,
                time: defaults.time,
                merchant: "",
                categoryLabel: CATEGORIES[0].label,
                amount: "",
                type: "expense",
            });
            setError("");
        }
    }, [open]);

    // Smart Category Switching
    useEffect(() => {
        if (form.type === "income") {
            setForm(f => ({ ...f, categoryLabel: "Income" }));
        } else if (form.type === "expense" && form.categoryLabel === "Income") {
            setForm(f => ({ ...f, categoryLabel: "Other" }));
        }
    }, [form.type]);

    if (!open) return null;

    const handleSubmit = () => {
        if (!form.merchant.trim()) {
            setError("Merchant name is required.");
            return;
        }
        const rawAmount = parseFloat(form.amount);
        if (isNaN(rawAmount) || rawAmount <= 0) {
            setError("Please enter a valid positive amount.");
            return;
        }
        const amount = form.type === "expense" ? -Math.abs(rawAmount) : Math.abs(rawAmount);
        const cat = CATEGORIES.find((c) => c.label === form.categoryLabel) ?? CATEGORIES[0];
        const [year, month, day] = form.date.split("-").map(Number);
        const [hours, minutes] = form.time.split(":").map(Number);
        const combinedDate = new Date(year, month - 1, day, hours, minutes);

        addTransaction({
            date: combinedDate.toISOString(),
            merchant: form.merchant.trim(),
            category: cat,
            method: "manual",
            amount,
        });
        setError("");
        onClose();
    };

    return (
        /* backdrop */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* header */}
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Add Transaction</h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-4 mb-4">
                    {/* type tabs */}
                    <div className="flex rounded-lg border border-border p-1">
                        {(["expense", "income"] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setForm((f) => ({ ...f, type: t }))}
                                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${form.type === t
                                    ? t === "expense"
                                        ? "bg-red-500/10 text-red-500"
                                        : "bg-emerald-500/10 text-emerald-500"
                                    : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                {t === "expense" ? "Expense" : "Income"}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-3">
                        {/* date and time */}
                        <div className="flex gap-3">
                            <label className="flex-1">
                                <span className="mb-1 block text-xs text-muted-foreground">Date</span>
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </label>
                            <label className="w-1/3">
                                <span className="mb-1 block text-xs text-muted-foreground">Time</span>
                                <input
                                    type="time"
                                    value={form.time}
                                    onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </label>
                        </div>

                        {/* merchant */}
                        <label className="block">
                            <span className="mb-1 block text-xs text-muted-foreground">Merchant / Source</span>
                            <input
                                type="text"
                                placeholder={form.type === "income" ? "e.g. Salary, Freelance, Bonus" : "e.g. Amazon, Swiggy, Netflix"}
                                value={form.merchant}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, merchant: e.target.value }))
                                }
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </label>

                        {/* category */}
                        <label className="block">
                            <span className="mb-1 block text-xs text-muted-foreground">Category</span>
                            <select
                                value={form.categoryLabel}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, categoryLabel: e.target.value }))
                                }
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                {CATEGORIES.map((c) => (
                                    <option key={c.label} value={c.label}>
                                        {c.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {/* amount */}
                        <label className="block">
                            <span className="mb-1 block text-xs text-muted-foreground">Amount (INR)</span>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                    ₹
                                </span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={form.amount}
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, amount: e.target.value }))
                                    }
                                    className="w-full rounded-lg border border-border bg-background py-2 pl-7 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                        </label>
                    </div>
                </div>

                {error && (
                    <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">
                        {error}
                    </p>
                )}

                <div className="mt-5 flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded-lg border border-border py-2 text-sm transition hover:bg-muted"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground shadow transition hover:opacity-90"
                    >
                        Add Transaction
                    </button>
                </div>
            </div>
        </div>
    );
}
