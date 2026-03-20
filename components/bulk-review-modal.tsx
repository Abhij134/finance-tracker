"use client";
import React from 'react';

type Props = {
    transactions: any[];
    onSave: (txs: any[]) => void;
    onClose: () => void;
};

export function BulkReviewModal({ transactions, onSave, onClose }: Props) {
    if (!transactions || transactions.length === 0) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-emerald-400 text-sm font-medium flex justify-between items-center mb-4">
                    <span>Successfully extracted {transactions.length} transactions</span>
                </div>
                <div className="flex flex-col space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 mb-6">
                    {transactions.map((tx, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-[#1a1a1a] border border-gray-800 p-3 rounded-lg">
                            <div className="flex flex-col">
                                <span className="text-white text-sm font-medium">{tx.merchant}</span>
                                <span className="text-gray-400 text-xs">{tx.date} {tx.time ? `• ${tx.time}` : ''} • {tx.category}</span>
                            </div>
                            <span className="text-white font-medium text-sm">
                                {tx.type === 'Expense' || tx.amount < 0 ? '-' : '+'}₹{Math.abs(tx.amount).toFixed(2)}
                            </span>
                        </div>
                    ))}
                </div>
                <button
                    onClick={() => onSave(transactions)}
                    className="w-full bg-white text-black py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                    Save All {transactions.length} to Database
                </button>
            </div>
        </div>
    );
}
