import { useState, useEffect } from "react";
import { Calculator } from "lucide-react";
import { motion } from "framer-motion";

export const fmtIN = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
export const fmtUSD = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const StackedBar = ({ p1, p2, label1, label2, color1 = "bg-slate-500", color2 = "bg-emerald-500" }: any) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="mt-8 w-full">
        <div className="group h-4 w-full rounded-full flex overflow-hidden bg-slate-800 hover:h-5 transition-all duration-300 ease-out cursor-pointer">
            <div style={{ width: `${p1}%` }} className={`h-full ${color1} transition-all duration-500 group-hover:brightness-110`}></div>
            <div style={{ width: `${p2}%` }} className={`h-full ${color2} transition-all duration-500 group-hover:brightness-110`}></div>
        </div>
        <div className="flex justify-between mt-2 text-[10px] uppercase font-bold tracking-widest">
            <span className="text-zinc-400">{label1} {p1.toFixed(1)}%</span>
            <span className="text-emerald-400">{label2} {p2.toFixed(1)}%</span>
        </div>
    </motion.div>
);

const DonutChart = ({ p1, color1 = "#10b981", color2 = "#334155", centerLabel, centerValue, legend1, val1, legend2, val2, c1Class = "bg-emerald-500", c2Class = "bg-slate-700" }: any) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="flex flex-col sm:flex-row items-center gap-8 w-full mt-8">
        <div className="relative w-48 h-48 flex-shrink-0 group">
            <div
                className="w-full h-full rounded-full transition-transform duration-500 group-hover:scale-105 shadow-2xl"
                style={{ background: `conic-gradient(from 0deg, ${color1} ${p1}%, ${color2} ${p1}%)` }}
            ></div>
            <div className="absolute inset-0 m-auto w-36 h-36 bg-[#070b13] rounded-full flex flex-col items-center justify-center border-[6px] border-[#070b13]">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest text-center px-2">{centerLabel}</span>
                <span className="text-xl font-bold text-white max-w-[120px] truncate">{centerValue}</span>
            </div>
        </div>
        <div className="flex-1 space-y-4 w-full">
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5 hover:bg-white/10 transition-colors cursor-default">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${c1Class}`}></div>
                    <span className="text-sm text-slate-300 font-medium">{legend1}</span>
                </div>
                <span className="text-white font-bold">{val1}</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5 hover:bg-white/10 transition-colors cursor-default">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${c2Class}`}></div>
                    <span className="text-sm text-slate-300 font-medium">{legend2}</span>
                </div>
                <span className="text-white font-bold">{val2}</span>
            </div>
        </div>
    </motion.div>
);

const ContextBox = ({ text }: { text: string }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-100 rounded-lg p-4 text-sm leading-relaxed mt-6">
        <strong>Contextual Insight:</strong> {text}
    </motion.div>
);

const StatCard = ({ title, value, colorClass = "text-white", delay = 0.2 }: any) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay }} className="bg-white/5 border border-white/5 rounded-xl p-5 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:bg-white/10 hover:shadow-[0_4px_20px_rgba(16,185,129,0.15)] hover:border-emerald-500/30 cursor-default">
        <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{title}</p>
        <p className={`text-xl font-bold truncate ${colorClass}`}>{value}</p>
    </motion.div>
);

const ReceiptRow = ({ label, value, isBold = false, isSubtract = false, colorClass = "text-white" }: any) => (
    <div className={`flex justify-between items-center py-3 border-b border-white/5 last:border-0 transition-all duration-200 hover:bg-white/5 hover:px-2 rounded-md cursor-default ${isBold ? 'font-bold text-white' : 'text-sm'}`}>
        <span className="text-zinc-400">{label}</span>
        <span className={colorClass}>{isSubtract ? '- ' : ''}{value}</span>
    </div>
);

export function ComingSoonPlaceholder({ name }: { name: string }) {
    return (
        <div className="w-full h-full flex flex-col justify-center items-center py-20">
            <Calculator className="w-16 h-16 text-emerald-500/20 mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">{name} is Coming Soon</h3>
            <p className="text-zinc-500">We are currently building this calculator.</p>
        </div>
    );
}

const InputGroup = ({ label, value, min, max, step = 1, onChange, prefix = "" }: any) => {
    const [displayVal, setDisplayVal] = useState(value);

    useEffect(() => {
        if (value !== 0 || displayVal !== '') {
            setDisplayVal(value);
        }
    }, [value]);

    const handleText = (e: any) => {
        const val = e.target.value;
        setDisplayVal(val);
        onChange({ target: { value: val === '' ? '' : val } });
    };

    const handleRange = (e: any) => {
        setDisplayVal(Number(e.target.value));
        onChange(e);
    };

    const handleIncrement = () => {
        const current = Number(value) || 0;
        const next = current + Number(step);
        if (max !== undefined && next > max) return;
        setDisplayVal(next);
        onChange({ target: { value: next } });
    };
    const handleDecrement = () => {
        const current = Number(value) || 0;
        const next = current - Number(step);
        if (min !== undefined && next < min) return;
        setDisplayVal(next);
        onChange({ target: { value: next } });
    };

    return (
        <div className="mb-3">
            <label className="text-sm text-slate-200 font-medium mb-1 block">{label}</label>
            <div className="relative bg-slate-800/80 border border-white/20 rounded-lg focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/50 transition-all group flex flex-col">
                <div className="relative w-full">
                    {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold">{prefix}</span>}
                    <input
                        type="number"
                        value={displayVal}
                        onChange={handleText}
                        className={`w-full bg-transparent p-2 text-white font-semibold outline-none transition-all pr-14 ${prefix ? 'pl-7' : ''}`}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-row gap-1 z-20">
                        <button onClick={handleDecrement} className="w-[20px] h-[20px] bg-black/40 border border-white/10 hover:bg-emerald-500 hover:text-emerald-950 text-zinc-400 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer">
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                        </button>
                        <button onClick={handleIncrement} className="w-[20px] h-[20px] bg-black/40 border border-white/10 hover:bg-emerald-500 hover:text-emerald-950 text-zinc-400 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer">
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
                        </button>
                    </div>
                </div>
                <div className="px-2 pb-1.5 mt-[-4px]">
                    <input
                        type="range" min={min} max={max} step={step}
                        value={value || 0} onChange={handleRange}
                        className="modern-slider w-full h-[4px] appearance-none m-0 opacity-70 group-hover:opacity-100 transition-opacity"
                    />
                </div>
            </div>
        </div>
    );
};

const Shell = ({ title, inputs, children }: any) => (
    <div className="w-full max-w-[1200px] mx-auto flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-[320px] flex-shrink-0 bg-[#070b13]/80 border border-white/5 rounded-3xl p-5 shadow-2xl h-fit relative z-10">
            <h3 className="text-lg font-bold text-white mb-5 uppercase tracking-wider">{title}</h3>
            <div className="space-y-2">
                {inputs}
            </div>
        </div>
        <div className="flex-1 bg-white/5 backdrop-blur-md rounded-2xl p-5 md:p-8 border border-white/5 relative overflow-hidden flex flex-col justify-center">
            <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] -translate-y-1/2 pointer-events-none"></div>
            <div className="relative z-10 w-full h-full flex flex-col justify-center">
                {children}
            </div>
        </div>
    </div>
);

// 1. Mortgage (US)
export function MortgageCalculator() {
    const [price, setPrice] = useState(300000);
    const [downPct, setDownPct] = useState(20);
    const [years, setYears] = useState(30);
    const [rate, setRate] = useState(6.5);

    const downPayment = price * (downPct / 100);
    const principal = price - downPayment;
    const mr = rate / (12 * 100);
    const n = years * 12;
    const monthlyPi = mr === 0 ? principal / n : (principal * mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1);
    const totalInterest = (monthlyPi * n) - principal;
    const totalPaid = principal + totalInterest;

    const principalPct = totalPaid > 0 ? (principal / totalPaid) * 100 : 0;

    return <Shell title="Mortgage Settings" inputs={<>
        <InputGroup label="Home Price" value={price} onChange={(e: any) => setPrice(+e.target.value)} min={50000} max={2000000} step={10000} prefix="$" />
        <InputGroup label="Down Payment (%)" value={downPct} onChange={(e: any) => setDownPct(+e.target.value)} min={0} max={100} step={1} />
        <InputGroup label="Term (Years)" value={years} onChange={(e: any) => setYears(+e.target.value)} min={5} max={40} step={1} />
        <InputGroup label="Interest Rate (%)" value={rate} onChange={(e: any) => setRate(+e.target.value)} min={1} max={15} step={0.1} />
    </>}>
        <div className="w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                <p className="text-[12px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Monthly P&I</p>
                <div className="text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">{fmtUSD(monthlyPi)}</div>
            </motion.div>

            <DonutChart p1={principalPct} centerLabel="Total Paid" centerValue={fmtUSD(totalPaid)} legend1="Principal" val1={fmtUSD(principal)} legend2="Interest" val2={fmtUSD(totalInterest)} />

            <ContextBox text={`Over ${years} years, you will pay ${fmtUSD(totalInterest)} in interest alone, which is ${(totalInterest / principal).toFixed(2)}x your original loan amount. Your total out-of-pocket cost will be ${fmtUSD(totalPaid + downPayment)} (including your down payment).`} />
        </div>
    </Shell>
}

// 2. 401(k) (US)
export function K401Calculator() {
    const [salary, setSalary] = useState(80000);
    const [cont, setCont] = useState(10);
    const [match, setMatch] = useState(5);
    const [ret, setRet] = useState(7);
    const [years, setYears] = useState(30);

    const k401Annual = salary * (cont / 100);
    const k401MatchAmt = salary * (Math.min(match, cont) / 100);
    const mr = ret / 100 / 12;
    const n = years * 12;
    const monthly = (k401Annual + k401MatchAmt) / 12;
    const total = monthly * ((Math.pow(1 + mr, n) - 1) / mr);
    const totalContributed = (k401Annual + k401MatchAmt) * years;

    const p1 = total > 0 ? (totalContributed / total) * 100 : 0;
    const p2 = total > 0 ? ((total - totalContributed) / total) * 100 : 0;

    return <Shell title="401(k) Projection" inputs={<>
        <InputGroup label="Annual Salary" value={salary} onChange={(e: any) => setSalary(+e.target.value)} min={30000} max={500000} step={5000} prefix="$" />
        <InputGroup label="Contribution (%)" value={cont} onChange={(e: any) => setCont(+e.target.value)} min={1} max={50} step={1} />
        <InputGroup label="Employer Match (%)" value={match} onChange={(e: any) => setMatch(+e.target.value)} min={0} max={15} step={1} />
        <InputGroup label="Expected Return (%)" value={ret} onChange={(e: any) => setRet(+e.target.value)} min={1} max={15} step={0.5} />
        <InputGroup label="Years to Retire" value={years} onChange={(e: any) => setYears(+e.target.value)} min={5} max={50} step={1} />
    </>}>
        <div className="w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                <p className="text-[12px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Estimated Balance</p>
                <div className="text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">{fmtUSD(total)}</div>
            </motion.div>
            <StackedBar p1={p1} p2={p2} label1="Total Contrib" label2="Est. Growth" />
            <div className="grid grid-cols-2 gap-4 mt-6">
                <StatCard title="Yearly Contribution" value={fmtUSD(k401Annual)} delay={0.3} />
                <StatCard title="Yearly Match" value={fmtUSD(k401MatchAmt)} colorClass="text-emerald-400" delay={0.4} />
            </div>
            <ContextBox text={`By investing ${fmtUSD(k401Annual)}/yr with an employer match of ${fmtUSD(k401MatchAmt)}/yr, you could reach ${fmtUSD(total)} in ${years} years. Growth alone accounts for ${p2.toFixed(1)}% of your final balance.`} />
        </div>
    </Shell>
}

// 3. Roth IRA (US)
export function RothIraCalculator() {
    const [cont, setCont] = useState(6000);
    const [ret, setRet] = useState(7);
    const [years, setYears] = useState(30);

    const mr = ret / 100 / 12;
    const n = years * 12;
    const monthly = cont / 12;
    const total = monthly * ((Math.pow(1 + mr, n) - 1) / mr);
    const totalContributed = cont * years;

    const p1 = total > 0 ? (totalContributed / total) * 100 : 0;
    const p2 = total > 0 ? ((total - totalContributed) / total) * 100 : 0;

    return <Shell title="Roth IRA" inputs={<>
        <InputGroup label="Annual Contribution" value={cont} onChange={(e: any) => setCont(+e.target.value)} min={1000} max={7000} step={500} prefix="$" />
        <InputGroup label="Expected Return (%)" value={ret} onChange={(e: any) => setRet(+e.target.value)} min={1} max={15} step={0.5} />
        <InputGroup label="Years to Retire" value={years} onChange={(e: any) => setYears(+e.target.value)} min={5} max={50} step={1} />
    </>}>
        <div className="w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                <p className="text-[12px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Tax-Free Balance</p>
                <div className="text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">{fmtUSD(total)}</div>
            </motion.div>
            <StackedBar p1={p1} p2={p2} label1="Total Contrib" label2="Tax-Free Growth" />
            <ContextBox text={`Contributing ${fmtUSD(cont)} annually for ${years} years results in ${fmtUSD(total)}. Because this is a Roth IRA, ${fmtUSD(total - totalContributed)} of that is pure, tax-free growth you can withdraw penalty-free at retirement.`} />
        </div>
    </Shell>
}

// 4. Sales Tax (US)
export function SalesTaxCalculator() {
    const [price, setPrice] = useState(1000);
    const [rate, setRate] = useState(8.5);

    const taxAmt = price * (rate / 100);
    const total = price + taxAmt;

    return <Shell title="Sales Tax" inputs={<>
        <InputGroup label="Item Price" value={price} onChange={(e: any) => setPrice(+e.target.value)} min={10} max={100000} step={10} prefix="$" />
        <InputGroup label="Combined Tax Rate (%)" value={rate} onChange={(e: any) => setRate(+e.target.value)} min={0} max={15} step={0.1} />
    </>}>
        <div className="w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="mb-6">
                <p className="text-[12px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Total Price</p>
                <div className="text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">{fmtUSD(total)}</div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="bg-black/20 rounded-xl p-4 border border-white/5">
                <ReceiptRow label="Base Price" value={fmtUSD(price)} />
                <ReceiptRow label={`Sales Tax (${rate}%)`} value={fmtUSD(taxAmt)} colorClass="text-rose-400" />
                <div className="my-2 border-t border-white/10" />
                <ReceiptRow label="Total Amount" value={fmtUSD(total)} isBold={true} colorClass="text-emerald-400" />
            </motion.div>
            <ContextBox text={`For a ${fmtUSD(price)} item at a ${rate}% tax rate, you will pay an additional ${fmtUSD(taxAmt)} to the state/local government, bringing your total to ${fmtUSD(total)}.`} />
        </div>
    </Shell>
}

// 5. EMI (IN)
export function EmiCalculator() {
    const [p, setP] = useState(500000);
    const [r, setR] = useState(8.5);
    const [y, setY] = useState(5);

    const mr = r / (12 * 100);
    const n = y * 12;
    const emi = mr === 0 ? p / n : (p * mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1);
    const totalInterest = emi * n - p;
    const totalPaid = p + totalInterest;

    const principalPct = totalPaid > 0 ? (p / totalPaid) * 100 : 0;

    return <Shell title="EMI Settings" inputs={<>
        <InputGroup label="Loan Amount" value={p} onChange={(e: any) => setP(+e.target.value)} min={50000} max={10000000} step={50000} prefix="₹" />
        <InputGroup label="Annual Rate (%)" value={r} onChange={(e: any) => setR(+e.target.value)} min={1} max={24} step={0.1} />
        <InputGroup label="Tenure (Years)" value={y} onChange={(e: any) => setY(+e.target.value)} min={1} max={30} step={1} />
    </>}>
        <div className="w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                <p className="text-[12px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Monthly EMI</p>
                <div className="text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">{fmtIN(emi)}</div>
            </motion.div>

            <DonutChart p1={principalPct} centerLabel="Total Paid" centerValue={fmtIN(totalPaid)} legend1="Principal" val1={fmtIN(p)} legend2="Interest" val2={fmtIN(totalInterest)} />

            <ContextBox text={`To clear a loan of ${fmtIN(p)} over ${y} years at ${r}% interest, your monthly commitment will be ${fmtIN(emi)}. You will end up paying an extra ${fmtIN(totalInterest)} in interest.`} />
        </div>
    </Shell>
}

// 6. Simple Interest (IN)
export function SiCalculator() {
    const [p, setP] = useState(100000);
    const [r, setR] = useState(8);
    const [t, setT] = useState(3);

    const interest = p * r * t / 100;
    const total = p + interest;
    const p1 = total > 0 ? (p / total) * 100 : 0;
    const p2 = total > 0 ? (interest / total) * 100 : 0;

    return <Shell title="Simple Interest" inputs={<>
        <InputGroup label="Principal" value={p} onChange={(e: any) => setP(+e.target.value)} min={10000} max={10000000} step={10000} prefix="₹" />
        <InputGroup label="Rate (%)" value={r} onChange={(e: any) => setR(+e.target.value)} min={1} max={20} step={0.5} />
        <InputGroup label="Time (Years)" value={t} onChange={(e: any) => setT(+e.target.value)} min={1} max={30} step={1} />
    </>}>
        <div className="w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                <p className="text-[12px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Total Amount</p>
                <div className="text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">{fmtIN(total)}</div>
            </motion.div>

            <StackedBar p1={p1} p2={p2} label1="Principal" label2="Interest" />

            <div className="grid grid-cols-2 gap-4 mt-6">
                <StatCard title="Principal" value={fmtIN(p)} delay={0.3} />
                <StatCard title="Total Interest" value={fmtIN(interest)} colorClass="text-emerald-400" delay={0.4} />
            </div>

            <ContextBox text={`Without compounding, a flat rate of ${r}% over ${t} years yields exactly ${fmtIN(interest)} on your ${fmtIN(p)} principal.`} />
        </div>
    </Shell>
}

// 7. Loan Comparison (IN)
export function LoanCompCalculator() {
    const [l1, setL1] = useState({ p: 500000, r: 8, y: 5 });
    const [l2, setL2] = useState({ p: 500000, r: 10, y: 5 });

    const calcEmi = (p: number, r: number, y: number) => { const mr = r / (12 * 100), n = y * 12; return mr === 0 ? p / n : p * mr * Math.pow(1 + mr, n) / (Math.pow(1 + mr, n) - 1); };
    const emi1 = calcEmi(l1.p, l1.r, l1.y);
    const emi2 = calcEmi(l2.p, l2.r, l2.y);
    const total1 = emi1 * l1.y * 12;
    const total2 = emi2 * l2.y * 12;
    const diff = Math.abs(total1 - total2);

    return <Shell title="Loan Compare" inputs={<>
        <h4 className="text-emerald-400 font-bold mb-2 border-b border-white/10 pb-2">Loan Option 1</h4>
        <div className="flex flex-col gap-1 mb-4">
            <InputGroup label="Amount" value={l1.p} onChange={(e: any) => setL1({ ...l1, p: +e.target.value })} min={10000} max={10000000} step={10000} prefix="₹" />
            <div className="grid grid-cols-2 gap-2">
                <InputGroup label="Rate (%)" value={l1.r} onChange={(e: any) => setL1({ ...l1, r: +e.target.value })} min={1} max={20} step={0.5} />
                <InputGroup label="Years" value={l1.y} onChange={(e: any) => setL1({ ...l1, y: +e.target.value })} min={1} max={30} step={1} />
            </div>
        </div>
        <h4 className="text-teal-400 font-bold mb-2 border-b border-white/10 pb-2">Loan Option 2</h4>
        <div className="flex flex-col gap-1">
            <InputGroup label="Amount" value={l2.p} onChange={(e: any) => setL2({ ...l2, p: +e.target.value })} min={10000} max={10000000} step={10000} prefix="₹" />
            <div className="grid grid-cols-2 gap-2">
                <InputGroup label="Rate (%)" value={l2.r} onChange={(e: any) => setL2({ ...l2, r: +e.target.value })} min={1} max={20} step={0.5} />
                <InputGroup label="Years" value={l2.y} onChange={(e: any) => setL2({ ...l2, y: +e.target.value })} min={1} max={30} step={1} />
            </div>
        </div>
    </>}>
        <div className="space-y-4 w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="grid grid-cols-2 gap-4">
                <StatCard title="Loan 1 EMI" value={fmtIN(emi1)} colorClass="text-emerald-400" delay={0.1} />
                <StatCard title="Loan 2 EMI" value={fmtIN(emi2)} colorClass="text-teal-400" delay={0.2} />
                <StatCard title="Loan 1 Total" value={fmtIN(total1)} delay={0.3} />
                <StatCard title="Loan 2 Total" value={fmtIN(total2)} delay={0.4} />
            </motion.div>

            <ContextBox text={`By choosing Option ${total1 < total2 ? '1' : '2'} over Option ${total1 < total2 ? '2' : '1'}, you will save ${fmtIN(diff)} over the course of the loan.`} />
        </div>
    </Shell>
}

// 8. SIP (IN)
export function SipCalculator() {
    const [p, setP] = useState(5000);
    const [r, setR] = useState(12);
    const [t, setT] = useState(10);

    const i = r / (12 * 100);
    const n = t * 12;
    const maturity = p * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
    const invested = p * n;
    const returns = maturity - invested;

    const p1 = maturity > 0 ? (invested / maturity) * 100 : 0;
    const p2 = maturity > 0 ? (returns / maturity) * 100 : 0;

    return <Shell title="SIP Calculator" inputs={<>
        <InputGroup label="Monthly Investment" value={p} onChange={(e: any) => setP(+e.target.value)} min={500} max={100000} step={500} prefix="₹" />
        <InputGroup label="Expected Return (%)" value={r} onChange={(e: any) => setR(+e.target.value)} min={1} max={30} step={0.5} />
        <InputGroup label="Time Period (Years)" value={t} onChange={(e: any) => setT(+e.target.value)} min={1} max={40} step={1} />
    </>}>
        <div className="w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                <p className="text-[12px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Total Value</p>
                <div className="text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">{fmtIN(maturity)}</div>
            </motion.div>

            <DonutChart p1={p1} centerLabel="Invested" centerValue={fmtIN(invested)} legend1="Invested Amount" val1={fmtIN(invested)} legend2="Est. Returns" val2={"+" + fmtIN(returns)} color1="#64748b" color2="#10b981" c1Class="bg-slate-500" c2Class="bg-emerald-500" />

            <ContextBox text={`By investing ${fmtIN(p)} consistently every month for ${t} years at an expected ${r}%, your money works for you. You only put in ${fmtIN(invested)}, but compounding generated ${fmtIN(returns)} in wealth.`} />
        </div>
    </Shell>
}

// 9. Lumpsum (IN)
export function LumpsumCalculator() {
    const [p, setP] = useState(100000);
    const [r, setR] = useState(12);
    const [t, setT] = useState(10);

    const maturity = p * Math.pow(1 + r / 100, t);
    const returns = maturity - p;
    const p1 = maturity > 0 ? (p / maturity) * 100 : 0;
    const p2 = maturity > 0 ? (returns / maturity) * 100 : 0;

    return <Shell title="Lumpsum" inputs={<>
        <InputGroup label="Total Investment" value={p} onChange={(e: any) => setP(+e.target.value)} min={5000} max={10000000} step={5000} prefix="₹" />
        <InputGroup label="Expected Return (%)" value={r} onChange={(e: any) => setR(+e.target.value)} min={1} max={30} step={0.5} />
        <InputGroup label="Time Period (Years)" value={t} onChange={(e: any) => setT(+e.target.value)} min={1} max={40} step={1} />
    </>}>
        <div className="w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                <p className="text-[12px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Total Value</p>
                <div className="text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">{fmtIN(maturity)}</div>
            </motion.div>

            <StackedBar p1={p1} p2={p2} label1="Invested" label2="Est. Returns" />

            <ContextBox text={`A one-time investment of ${fmtIN(p)} could turn into ${fmtIN(maturity)} after ${t} years. That's a pure profit of ${fmtIN(returns)} just by staying invested.`} />
        </div>
    </Shell>
}

// 10. Compound Interest (IN)
export function CompoundInterestCalculator() {
    const [p, setP] = useState(100000);
    const [r, setR] = useState(8);
    const [t, setT] = useState(10);
    const [freq, setFreq] = useState(12);

    const maturity = p * Math.pow(1 + (r / (freq * 100)), freq * t);
    const returns = maturity - p;
    const p1 = maturity > 0 ? (p / maturity) * 100 : 0;
    const p2 = maturity > 0 ? (returns / maturity) * 100 : 0;

    return <Shell title="Compounding" inputs={<>
        <InputGroup label="Initial Investment" value={p} onChange={(e: any) => setP(+e.target.value)} min={10000} max={10000000} step={10000} prefix="₹" />
        <InputGroup label="Interest Rate (%)" value={r} onChange={(e: any) => setR(+e.target.value)} min={1} max={30} step={0.5} />
        <InputGroup label="Time (Years)" value={t} onChange={(e: any) => setT(+e.target.value)} min={1} max={50} step={1} />
        <div>
            <label className="text-sm text-slate-200 font-medium mb-2 block">Compounding Frequency</label>
            <select value={freq} onChange={e => setFreq(+e.target.value)} className="w-full bg-slate-800/80 border border-white/20 rounded-lg p-3 text-white font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all">
                <option value={1}>Annually</option>
                <option value={2}>Semi-Annually</option>
                <option value={4}>Quarterly</option>
                <option value={12}>Monthly</option>
                <option value={365}>Daily</option>
            </select>
        </div>
    </>}>
        <div className="w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                <p className="text-[12px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Final Amount</p>
                <div className="text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">{fmtIN(maturity)}</div>
            </motion.div>

            <StackedBar p1={p1} p2={p2} label1="Principal" label2="Interest" color2="bg-teal-400" />

            <div className="grid grid-cols-2 gap-4 mt-6">
                <StatCard title="Initial Deposit" value={fmtIN(p)} delay={0.3} />
                <StatCard title="Interest Earned" value={"+" + fmtIN(returns)} colorClass="text-teal-400" delay={0.4} />
            </div>

            <ContextBox text={`Compounding ${freq === 1 ? 'once' : freq} times a year accelerates your wealth. Your interest earns its own interest, yielding ${fmtIN(returns)}.`} />
        </div>
    </Shell>
}

// 11. FD (IN)
export function FdCalculator() {
    const [p, setP] = useState(100000);
    const [r, setR] = useState(6.5);
    const [t, setT] = useState(3);

    const maturity = p * Math.pow(1 + r / (4 * 100), 4 * t);
    const interest = maturity - p;

    return <Shell title="Fixed Deposit" inputs={<>
        <InputGroup label="Deposit Amount" value={p} onChange={(e: any) => setP(+e.target.value)} min={10000} max={10000000} step={10000} prefix="₹" />
        <InputGroup label="Rate of Interest (%)" value={r} onChange={(e: any) => setR(+e.target.value)} min={3} max={12} step={0.1} />
        <InputGroup label="Time Period (Years)" value={t} onChange={(e: any) => setT(+e.target.value)} min={1} max={10} step={1} />
    </>}>
        <div className="w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                <p className="text-[12px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Maturity Value</p>
                <div className="text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">{fmtIN(maturity)}</div>
            </motion.div>

            <div className="grid grid-cols-2 gap-4 mt-6">
                <StatCard title="Principal Amount" value={fmtIN(p)} delay={0.2} />
                <StatCard title="Total Interest" value={fmtIN(interest)} colorClass="text-emerald-400" delay={0.3} />
            </div>

            <ContextBox text={`A safe, risk-free FD investment of ${fmtIN(p)} will earn you a guaranteed ${fmtIN(interest)} in interest over ${t} years (assuming standard quarterly compounding).`} />
        </div>
    </Shell>
}

// 12. PPF (IN)
export function PpfCalculator() {
    const [amt, setAmt] = useState(150000);
    const [years, setYears] = useState(15);
    const rate = 7.1; // Fixed rate currently in India

    let bal = 0;
    for (let i = 0; i < years; i++) { bal = (bal + amt) * (1 + rate / 100); }
    const invested = amt * years;

    const p1 = bal > 0 ? (invested / bal) * 100 : 0;
    const p2 = bal > 0 ? ((bal - invested) / bal) * 100 : 0;

    return <Shell title="PPF Calculator" inputs={<>
        <InputGroup label="Yearly Investment (Max ₹1.5L)" value={amt} onChange={(e: any) => setAmt(+e.target.value)} min={500} max={150000} step={500} prefix="₹" />
        <InputGroup label="Time Period (Min 15 Years)" value={years} onChange={(e: any) => setYears(+e.target.value)} min={15} max={50} step={1} />
        <div className="text-xs text-emerald-400 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 font-medium">Current PPF Rate: 7.1% (Tax Free)</div>
    </>}>
        <div className="w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                <p className="text-[12px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Maturity Amount</p>
                <div className="text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">{fmtIN(bal)}</div>
            </motion.div>

            <StackedBar p1={p1} p2={p2} label1="Total Invested" label2="Tax-Free Growth" />

            <ContextBox text={`By maxing out your PPF with ${fmtIN(amt)} every year for ${years} years, you build a massive, 100% tax-free corpus of ${fmtIN(bal)}. That is ${fmtIN(bal - invested)} purely in interest.`} />
        </div>
    </Shell>
}

// 13. Retirement (IN)
export function RetirementCalculator() {
    const [age, setAge] = useState(30);
    const [retAge, setRetAge] = useState(60);
    const [savings, setSavings] = useState(500000);
    const [monthly, setMonthly] = useState(20000);
    const [ret, setRet] = useState(10);

    const years = Math.max(0, retAge - age);
    const mr = ret / 100 / 12;
    const n = years * 12;
    const futureSavings = savings * Math.pow(1 + ret / 100, years);
    const futureMonthly = mr > 0 ? monthly * ((Math.pow(1 + mr, n) - 1) / mr) : monthly * n;
    const corpus = futureSavings + futureMonthly;

    const p1 = corpus > 0 ? (futureSavings / corpus) * 100 : 0;

    return <Shell title="Retirement" inputs={<>
        <div className="grid grid-cols-2 gap-2">
            <InputGroup label="Current Age" value={age} onChange={(e: any) => setAge(+e.target.value)} min={18} max={80} step={1} />
            <InputGroup label="Retirement Age" value={retAge} onChange={(e: any) => setRetAge(+e.target.value)} min={40} max={100} step={1} />
        </div>
        <InputGroup label="Current Savings" value={savings} onChange={(e: any) => setSavings(+e.target.value)} min={0} max={10000000} step={50000} prefix="₹" />
        <InputGroup label="Monthly Saving" value={monthly} onChange={(e: any) => setMonthly(+e.target.value)} min={0} max={500000} step={5000} prefix="₹" />
        <InputGroup label="Expected Return (%)" value={ret} onChange={(e: any) => setRet(+e.target.value)} min={1} max={20} step={0.5} />
    </>}>
        <div className="w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                <p className="text-[12px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Retirement Corpus</p>
                <div className="text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">{fmtIN(corpus)}</div>
            </motion.div>

            <DonutChart p1={p1} centerLabel="Timeline" centerValue={`${years} Yrs`} legend1="From Current Savings" val1={fmtIN(futureSavings)} legend2="From Monthly SIP" val2={fmtIN(futureMonthly)} color1="#64748b" color2="#10b981" c1Class="bg-slate-500" c2Class="bg-emerald-500" />

            <ContextBox text={`To retire by age ${retAge}, your current savings and disciplined SIP of ${fmtIN(monthly)}/mo will build a massive nest egg of ${fmtIN(corpus)}.`} />
        </div>
    </Shell>
}

// 14. Inflation (IN)
export function InflationCalculator() {
    const [expense, setExpense] = useState(50000);
    const [rate, setRate] = useState(6);
    const [years, setYears] = useState(10);

    const future = expense * Math.pow(1 + rate / 100, years);

    return <Shell title="Inflation" inputs={<>
        <InputGroup label="Current Monthly Expense" value={expense} onChange={(e: any) => setExpense(+e.target.value)} min={10000} max={1000000} step={5000} prefix="₹" />
        <InputGroup label="Expected Inflation Rate (%)" value={rate} onChange={(e: any) => setRate(+e.target.value)} min={1} max={15} step={0.5} />
        <InputGroup label="Years into Future" value={years} onChange={(e: any) => setYears(+e.target.value)} min={1} max={50} step={1} />
    </>}>
        <div className="w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="mb-6">
                <p className="text-[12px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Future Equivalent Expense</p>
                <div className="text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">{fmtIN(future)}</div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="bg-black/20 rounded-xl p-4 border border-white/5">
                <ReceiptRow label={`To maintain today's lifestyle of ${fmtIN(expense)}`} value={""} isBold={true} />
                <div className="my-2" />
                <ReceiptRow label={`Cost in ${years} years at ${rate}% inflation`} value={fmtIN(future)} colorClass="text-rose-400 font-bold" />
            </motion.div>

            <ContextBox text={`Due to a continuous ${rate}% inflation rate, the purchasing power of your money decreases significantly. In ${years} years, you will need ${fmtIN(future)} per month just to buy what ${fmtIN(expense)} buys today.`} />
        </div>
    </Shell>
}

// 15. GST (IN)
export function GstCalculator() {
    const [amount, setAmount] = useState(10000);
    const [rate, setRate] = useState(18);
    const [mode, setMode] = useState<'add' | 'remove'>('add');

    let base = 0, gst = 0, total = 0;
    if (mode === 'add') {
        base = amount;
        gst = amount * (rate / 100);
        total = amount + gst;
    } else {
        total = amount;
        base = amount * (100 / (100 + rate));
        gst = amount - base;
    }

    return <Shell title="GST Settings" inputs={<>
        <div className="flex bg-slate-900/80 rounded-lg p-1 border border-white/5 mb-6">
            <button onClick={() => setMode('add')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${mode === 'add' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-white'}`}>Add GST</button>
            <button onClick={() => setMode('remove')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${mode === 'remove' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-white'}`}>Remove GST</button>
        </div>
        <InputGroup label={mode === 'add' ? 'Base Amount' : 'Total Amount (Inc GST)'} value={amount} onChange={(e: any) => setAmount(+e.target.value)} min={100} max={1000000} step={100} prefix="₹" />
        <div>
            <label className="text-sm text-slate-200 font-medium mb-2 block">GST Rate (%)</label>
            <div className="grid grid-cols-5 gap-2">
                {[3, 5, 12, 18, 28].map(r => (
                    <button key={r} onClick={() => setRate(r)} className={`py-2 text-xs font-bold rounded-lg border transition-all ${rate === r ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-slate-800/80 border-white/20 text-zinc-300 hover:border-emerald-500/50'}`}>{r}%</button>
                ))}
            </div>
        </div>
    </>}>
        <div className="w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="mb-6">
                <p className="text-[12px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Total Amount</p>
                <div className="text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">{fmtIN(total)}</div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="bg-black/20 rounded-xl p-4 border border-white/5">
                <ReceiptRow label="Base Price" value={fmtIN(base)} />
                <ReceiptRow label={`CGST (${rate / 2}%)`} value={fmtIN(gst / 2)} colorClass="text-emerald-400" />
                <ReceiptRow label={`SGST (${rate / 2}%)`} value={fmtIN(gst / 2)} colorClass="text-emerald-400" />
                <div className="my-2 border-t border-white/10" />
                <ReceiptRow label="Total Value" value={fmtIN(total)} isBold={true} />
            </motion.div>

            <ContextBox text={mode === 'add' ? `Applying an ${rate}% GST to the base price of ${fmtIN(base)} increases the final cost to ${fmtIN(total)}.` : `The total price of ${fmtIN(total)} includes ${fmtIN(gst)} of GST. The original pre-tax value is ${fmtIN(base)}.`} />
        </div>
    </Shell>
}

// 16. Gratuity (IN)
export function GratuityCalculator() {
    const [sal, setSal] = useState(50000);
    const [years, setYears] = useState(10);

    // Formula: 15 * Last Drawn Basic * Years / 26
    const gratuity = (15 * sal * years) / 26;

    return <Shell title="Gratuity" inputs={<>
        <InputGroup label="Last Drawn Basic + DA" value={sal} onChange={(e: any) => setSal(+e.target.value)} min={10000} max={1000000} step={5000} prefix="₹" />
        <InputGroup label="Years of Service" value={years} onChange={(e: any) => setYears(+e.target.value)} min={5} max={40} step={1} />
        <div className="text-xs text-emerald-400 font-medium">Note: Min 5 years of continuous service required to be eligible for gratuity.</div>
    </>}>
        <div className="w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                <p className="text-[12px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Estimated Gratuity</p>
                <div className="text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">{fmtIN(gratuity)}</div>
            </motion.div>

            <div className="grid grid-cols-2 gap-4 mt-6">
                <StatCard title="Last Basic Pay" value={fmtIN(sal)} delay={0.2} />
                <StatCard title="Years Served" value={years} delay={0.3} />
            </div>

            <ContextBox text={`After dedicating ${years} years to your company, your estimated gratuity payout based on your last drawn basic is ${fmtIN(gratuity)}.`} />
        </div>
    </Shell>
}

// 17. Salary (IN)
export function SalaryCalculator() {
    const [ctc, setCtc] = useState(1200000);
    const [basicPct, setBasicPct] = useState(40);
    const [hraPct, setHraPct] = useState(50);
    const [pfPct, setPfPct] = useState(12);
    const [pt, setPt] = useState(200);

    const basic = ctc * (basicPct / 100);
    const hra = basic * (hraPct / 100);
    const pf = basic * (pfPct / 100);
    const special = ctc - basic - hra - (pf * 2);

    const mBasic = basic / 12;
    const mHra = hra / 12;
    const mSpecial = special / 12;
    const mPf = pf / 12;
    const gross = mBasic + mHra + mSpecial;
    const inHand = gross - mPf - pt;

    return <Shell title="Salary Setup" inputs={<>
        <InputGroup label="Annual CTC" value={ctc} onChange={(e: any) => setCtc(+e.target.value)} min={300000} max={10000000} step={100000} prefix="₹" />
        <div className="grid grid-cols-2 gap-2">
            <InputGroup label="Basic Pay (%)" value={basicPct} onChange={(e: any) => setBasicPct(+e.target.value)} min={10} max={80} step={1} />
            <InputGroup label="HRA (% of Basic)" value={hraPct} onChange={(e: any) => setHraPct(+e.target.value)} min={10} max={50} step={1} />
        </div>
        <div className="grid grid-cols-2 gap-2">
            <InputGroup label="PF (% of Basic)" value={pfPct} onChange={(e: any) => setPfPct(+e.target.value)} min={0} max={12} step={1} />
            <InputGroup label="Prof Tax / mo" value={pt} onChange={(e: any) => setPt(+e.target.value)} min={0} max={1000} step={50} prefix="₹" />
        </div>
    </>}>
        <div className="w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="mb-6">
                <p className="text-[12px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Monthly In-Hand</p>
                <div className="text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">{fmtIN(inHand)}</div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="bg-black/20 rounded-xl p-4 border border-white/5 space-y-1">
                <ReceiptRow label="Basic Salary" value={fmtIN(mBasic)} />
                <ReceiptRow label="HRA" value={fmtIN(mHra)} />
                <ReceiptRow label="Special Allowances" value={fmtIN(mSpecial)} />
                <div className="my-2 border-t border-white/10" />
                <ReceiptRow label="Gross Salary" value={fmtIN(gross)} isBold={true} colorClass="text-emerald-400" />
                <ReceiptRow label="Employee PF" value={fmtIN(mPf)} isSubtract={true} colorClass="text-rose-400" />
                <ReceiptRow label="Professional Tax" value={fmtIN(pt)} isSubtract={true} colorClass="text-rose-400" />
                <div className="my-2 border-t border-white/10" />
                <ReceiptRow label="Net Take Home" value={fmtIN(inHand)} isBold={true} colorClass="text-emerald-400" />
            </motion.div>

            <ContextBox text={`Out of your ${fmtIN(ctc)} CTC, you take home ${fmtIN(inHand)} monthly. The mandatory PF deductions act as a forced savings of ${fmtIN(mPf * 2)} per month (including employer match).`} />
        </div>
    </Shell>
}
