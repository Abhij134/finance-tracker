"use client";

import { useState, useEffect } from "react";
import { X, ArrowLeft, Calculator, TrendingUp, Home, PieChart, Activity, DollarSign, Percent, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ComingSoonPlaceholder, EmiCalculator, SipCalculator, GstCalculator, CompoundInterestCalculator, SalaryCalculator, SiCalculator, LoanCompCalculator, LumpsumCalculator, FdCalculator, PpfCalculator, RetirementCalculator, InflationCalculator, GratuityCalculator } from "./_calculators";

type CalcTab = 'grid' | 'emi'|'si'|'loancomp'|'sip'|'lumpsum'|'compound'|'fd'|'ppf'|'budget'|'daily'|'retirement'|'inflation'|'gst'|'gratuity'|'salary';

export default function CalculatorModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [calcTab, setCalcTab] = useState<CalcTab>('grid');

    // Calculations and states have been moved to individual components in _calculators.tsx

    // Body lock
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; }
    }, [isOpen]);

    const categories = [
        {
            title: "Loan & EMI",
            items: [
                { id: 'emi', name: 'EMI Calculator', desc: 'Calculate monthly EMI for home, car, or personal loans', icon: Calculator },
                { id: 'si', name: 'Simple Interest Calculator', desc: 'Calculate interest on loans and investments easily', icon: Percent },
                { id: 'loancomp', name: 'Loan Comparison', desc: 'Compare two loan offers side by side', icon: Activity },
            ]
        },
        {
            title: "Investment & Savings",
            items: [
                { id: 'sip', name: 'SIP Calculator', desc: 'Plan your mutual fund SIP investments', icon: TrendingUp },
                { id: 'lumpsum', name: 'Lumpsum Calculator', desc: 'Estimate returns on a one-time investment', icon: DollarSign },
                { id: 'compound', name: 'Compound Interest Calculator', desc: 'See how compounding grows your money', icon: TrendingUp },
                { id: 'fd', name: 'FD Calculator', desc: 'Calculate fixed deposit maturity amount', icon: Percent },
                { id: 'ppf', name: 'PPF Calculator', desc: 'Estimate Public Provident Fund maturity', icon: PieChart },
            ]
        },
        {
            title: "Planning & Tax",
            items: [
                { id: 'retirement', name: 'Retirement Calculator', desc: 'Plan how much you need to save for retirement', icon: Home },
                { id: 'inflation', name: 'Inflation Calculator', desc: 'See how inflation erodes your purchasing power', icon: TrendingUp },
                { id: 'gst', name: 'GST Calculator', desc: 'Calculate GST with CGST, SGST & IGST breakdown', icon: Percent },
                { id: 'gratuity', name: 'Gratuity Calculator', desc: 'Estimate gratuity based on salary & service years', icon: Calculator },
                { id: 'salary', name: 'Salary Calculator', desc: 'Convert CTC to in-hand salary with full breakdown', icon: DollarSign },
            ]
        }
    ];

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 md:p-8">
            <div className="w-full h-full sm:w-[95vw] sm:h-[90vh] lg:w-[90vw] lg:h-[85vh] max-w-6xl bg-slate-950 border border-white/10 sm:rounded-2xl flex flex-col overflow-hidden relative shadow-[0_0_80px_rgba(0,0,0,0.5)]">
                
                {/* Header */}
                <div className="flex-shrink-0 p-4 sm:p-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-md z-10">
                    <div className="flex items-center gap-4">
                        {calcTab !== 'grid' && (
                            <button onClick={() => setCalcTab('grid')} className="text-zinc-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5">
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">Financial Calculators</h2>
                            <p className="text-xs sm:text-sm text-zinc-400 mt-1 hidden sm:block">Free online calculators to help you make better financial decisions</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6" tabIndex={0}>
                    {calcTab === 'grid' ? (
                        <div className="space-y-12">
                            {categories.map((cat) => (
                                <div key={cat.title}>
                                    <h3 className="text-lg font-bold text-zinc-300 mb-6">{cat.title}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {cat.items.map((item) => (
                                            <div 
                                                key={item.id} 
                                                onClick={() => setCalcTab(item.id as CalcTab)}
                                                className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 rounded-xl p-5 cursor-pointer transition-all group flex flex-col h-full"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                    <item.icon className="h-5 w-5 text-emerald-400" />
                                                </div>
                                                <h4 className="font-bold text-white mb-2">{item.name}</h4>
                                                <p className="text-xs text-zinc-400 flex-1 leading-relaxed">{item.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Footer inside Grid */}
                            <div className="mt-16 bg-white/[0.02] border border-white/5 rounded-xl p-8">
                                <h3 className="text-xl font-bold text-white mb-8 text-center">Why Use Our Financial Calculators?</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div>
                                        <h4 className="font-bold text-white mb-2">100% Free & Private</h4>
                                        <p className="text-sm text-zinc-400">All calculations happen in your browser. No data is stored or sent to any server.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white mb-2">Accurate Formulas</h4>
                                        <p className="text-sm text-zinc-400">Industry-standard formulas used by banks and financial institutions.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white mb-2">Comprehensive Coverage</h4>
                                        <p className="text-sm text-zinc-400">Calculate EMI, SIP, PPF, GST, gratuity, salary, and retirement plans all in one place.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col">
                            {(() => {
                                switch (calcTab) {
                                    case 'emi': return <EmiCalculator />;
                                    case 'si': return <SiCalculator />;
                                    case 'loancomp': return <LoanCompCalculator />;
                                    case 'sip': return <SipCalculator />;
                                    case 'lumpsum': return <LumpsumCalculator />;
                                    case 'compound': return <CompoundInterestCalculator />;
                                    case 'fd': return <FdCalculator />;
                                    case 'ppf': return <PpfCalculator />;
                                    case 'retirement': return <RetirementCalculator />;
                                    case 'inflation': return <InflationCalculator />;
                                    case 'gst': return <GstCalculator />;
                                    case 'gratuity': return <GratuityCalculator />;
                                    case 'salary': return <SalaryCalculator />;
                                    default:
                                        const name = categories.flatMap(c => c.items).find(i => i.id === calcTab)?.name || calcTab;
                                        return <ComingSoonPlaceholder name={name} />;
                                }
                            })()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
