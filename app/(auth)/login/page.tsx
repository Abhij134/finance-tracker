"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState, FormEvent, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Shield, Wallet, Activity, Target, ArrowRight, X, Eye, EyeOff, ChevronLeft, ChevronUp, User, LayoutDashboard, TrendingUp, ArrowDownRight, CircleDollarSign, Battery, Wifi, Signal, Calculator, Sparkles, Bot } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
    signInUser,
    signUpUser,
    sendPasswordResetOTP,
    verifyResetOTPAndSetPassword,
    recoverUserId
} from "@/app/actions/auth";
import { toast } from "sonner";
import Link from "next/link";
import Lottie from "lottie-react";
import dynamic from "next/dynamic";

const CalculatorModal = dynamic(
  () => import("./_calculator_modal"),
  { ssr: false }
);

type AuthState = "login" | "signup" | "forgot_password_email" | "forgot_password_otp" | "forgot_userid_email" | "forgot_userid_otp" | "userid_recovered" | "privacy" | "terms";

const ROTATING = ["Expenses", "Subscriptions", "Statements", "Budgets", "Insights"];

function FaqItem({ question, answer }: { question: string; answer: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div className={`group rounded-xl border transition-all duration-300 ${open ? 'border-emerald-500/40 bg-[#10182b] shadow-[0_8px_24px_rgba(0,0,0,0.5),0_0_16px_rgba(16,185,129,0.1)]' : 'border-white/10 bg-[#0c1220]/90 hover:border-emerald-500/30 hover:bg-[#101728] shadow-sm'}`}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 sm:px-4 sm:py-3 text-left font-semibold text-white transition-colors gap-3"
            >
                <span className={`text-xs sm:text-sm font-semibold transition-colors leading-snug ${open ? 'text-emerald-400' : 'text-zinc-100 group-hover:text-emerald-400'}`}>
                    {question}
                </span>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 ${open ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-zinc-400 group-hover:bg-emerald-500/15 group-hover:text-emerald-400'}`}>
                    <ChevronLeft className={`w-3.5 h-3.5 transition-transform duration-300 ${open ? '-rotate-90' : 'rotate-0'}`} />
                </div>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-3.5 pb-3.5 pt-0 sm:px-4 text-xs sm:text-sm text-zinc-300 leading-relaxed border-t border-white/[0.04] mt-1 pt-2.5">
                            {answer}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function LandingAndLoginPage() {
    const router = useRouter();
    const supabase = createClient();
    const { scrollY } = useScroll();
    const scrollOpacity = useTransform(scrollY, [0, 100], [1, 0]);

    // UI Overlay State
    const [showLogin, setShowLogin] = useState(false);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<AuthState>("login");

    // Form Field States
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [userId, setUserId] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);

    // Forgot Password States
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [recoveredUserId, setRecoveredUserId] = useState("");

    // Hero Modal State
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (showLogin || isCalculatorOpen) {
            window.scrollTo(0, 0);
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [showLogin, isCalculatorOpen]);
    const [rotatingIdx, setRotatingIdx] = useState(0);





    const [scanAnimation, setScanAnimation] = useState<any>(null);

    useEffect(() => {
        let mounted = true;
        import("@/public/lottie/scan.json")
            .then(m => { if (mounted) setScanAnimation(m.default); })
            .catch(err => console.error("Error loading scan animation", err));
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        const t = setInterval(() => setRotatingIdx((i) => (i + 1) % ROTATING.length), 2200);
        return () => clearInterval(t);
    }, []);

    // Check if user is already authenticated on mount
    useEffect(() => {
        const checkSession = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                router.push("/dashboard");
            }
        };
        checkSession();
    }, [supabase, router]);

    const resetForm = () => {
        setEmail("");
        setPassword("");
        setUsername("");
        setUserId("");
        setOtp(["", "", "", "", "", ""]);
        setNewPassword("");
        setConfirmPassword("");
        setShowPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        setRememberMe(true);
    };

    const handleSwitchView = (newView: AuthState) => {
        setView(newView);
        resetForm();
    };

    // --- ACTIONS --- //

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData();
        formData.append("userId", userId);
        formData.append("password", password);
        formData.append("rememberMe", rememberMe.toString());

        const { success, error } = await signInUser(formData);
        setLoading(false);

        if (!success) {
            toast.error(error || "Invalid login credentials.");
            return;
        }

        toast.success("Welcome back!");
        router.push("/dashboard");
    };

    const handleSignUp = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData();
        formData.append("email", email);
        formData.append("password", password);
        formData.append("username", username);
        formData.append("userId", userId);

        const { success, error } = await signUpUser(formData);
        setLoading(false);

        if (!success) {
            toast.error(error || "Failed to create account.");
            return;
        }

        toast.success("Account created! Welcome to FinanceNeo.");
        router.push("/dashboard");
    };

    const handleSendRecoveryOTP = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { success, error } = await sendPasswordResetOTP(email);
        setLoading(false);

        if (!success) {
            toast.error(error || "Failed to send recovery code.");
            return;
        }

        toast.success("Recovery code sent to your email.");
        setView("forgot_password_otp");
    };

    const handleSendUserIdRecoveryOTP = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { success, error } = await sendPasswordResetOTP(email);
        setLoading(false);

        if (!success) {
            toast.error(error || "Failed to send recovery code.");
            return;
        }

        toast.success("Recovery code sent to your email.");
        setView("forgot_userid_otp");
    };

    const handleResetPassword = async (e: FormEvent) => {
        e.preventDefault();

        const token = otp.join("");
        if (token.length !== 6) {
            toast.error("Please enter the full 6-digit code.");
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }

        setLoading(true);

        const formData = new FormData();
        formData.append("email", email);
        formData.append("token", token);
        formData.append("newPassword", newPassword);
        formData.append("confirmPassword", confirmPassword);

        const { success, error } = await verifyResetOTPAndSetPassword(formData);
        setLoading(false);

        if (!success) {
            toast.error(error || "Failed to reset password.");
            return;
        }

        toast.success("Password secured! Please log in to verify.");
        handleSwitchView("login");
    };

    const handleRecoverUserIdOTP = async (e: FormEvent) => {
        e.preventDefault();

        const token = otp.join("");
        if (token.length !== 6) {
            toast.error("Please enter the full 6-digit code.");
            return;
        }

        setLoading(true);

        const formData = new FormData();
        formData.append("email", email);
        formData.append("token", token);

        const { success, error, userId: recoveredId } = await recoverUserId(formData);
        setLoading(false);

        if (!success || !recoveredId) {
            toast.error(error || "Failed to recover User ID.");
            return;
        }

        setRecoveredUserId(recoveredId);
        toast.success("Identity verified!");
        setView("userid_recovered");
    };

    // --- OTP UTILS --- //

    const handleOtpChange = (index: number, value: string) => {
        if (!/^[0-9]?$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 5) inputRefs.current[index + 1]?.focus();
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };


    return (
        <div className="relative min-h-screen text-white overflow-x-clip selection:bg-emerald-500/30 font-sans bg-[#050811]">
            {/* Landing Page Content */}
            <motion.div
                className="relative z-10 w-full min-h-screen flex flex-col"
                initial={false}
                animate={{
                    x: showLogin ? "-100vw" : "0vw",
                    pointerEvents: showLogin ? "none" : "auto",
                }}
                style={{
                    transform: showLogin ? undefined : "none",
                }}
                transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            >
                {/* Header Navbar Sticky on Scroll with Top and Bottom Borders */}
                <header className="sticky top-0 w-full border-t border-b border-white/[0.08] bg-[#070b13]/85 backdrop-blur-xl z-50 shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between gap-6 sm:gap-10 px-6 lg:px-16 py-2.5 lg:py-3.5 max-w-[1600px] mx-auto w-full">
                        {/* Logo */}
                        <div className="flex items-center gap-2 lg:gap-2.5 cursor-pointer shrink-0" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                            <Image
                                src="/logo.svg"
                                alt="FinanceNeo"
                                width={24}
                                height={24}
                                className="w-5 h-5 lg:w-8 lg:h-8 rounded-lg object-contain drop-shadow-md"
                                priority
                            />
                            <span className="text-xs lg:text-lg font-bold tracking-tight text-white whitespace-nowrap">
                                Finance<span className="text-[#4ecca3]">Neo</span>
                            </span>
                        </div>

                        {/* Nav Actions */}
                        <div className="flex items-center gap-1.5 sm:gap-2.5">
                        </div>
                    </div>
                </header>

                {/* Global Slider Hero Section */}
                <div className="relative w-full min-h-[85vh] overflow-hidden flex flex-col justify-center">

                    {/* Hero Layout */}
                    <div className="flex w-full">
                        {/* ── Original Hero (Text + Mockups) ── */}
                        <div className="w-full flex flex-col lg:flex-row items-center px-8 lg:px-16 pt-16 lg:pt-14 pb-12 max-w-[1600px] mx-auto gap-12 lg:gap-20">

                            {/* Left Column - Text Content */}
                            <div className="flex-1 flex flex-col justify-center max-w-2xl text-left -mt-8 lg:-mt-0">

                                <h1 className="font-sans text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-white md:text-5xl lg:text-7xl mb-3">
                                    <motion.span
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.7 }}
                                        className="block"
                                    >
                                        Understand your
                                    </motion.span>

                                    {/* Rotating word — vertical roll */}
                                    <span className="relative my-1 flex h-[1.1em] items-center overflow-hidden">
                                        <AnimatePresence mode="popLayout" initial={false}>
                                            <motion.span
                                                key={ROTATING[rotatingIdx]}
                                                initial={{ y: "110%", opacity: 0, rotateX: -40 }}
                                                animate={{ y: "0%", opacity: 1, rotateX: 0 }}
                                                exit={{ y: "-110%", opacity: 0, rotateX: 40 }}
                                                transition={{ type: "spring", stiffness: 140, damping: 18, mass: 0.6 }}
                                                style={{ transformOrigin: "50% 50%" }}
                                                className="inline-block bg-gradient-to-b from-emerald-300 to-emerald-500 bg-clip-text pr-2 text-transparent"
                                            >
                                                {ROTATING[rotatingIdx]}
                                            </motion.span>
                                        </AnimatePresence>
                                    </span>

                                    <motion.span
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.7, delay: 0.2 }}
                                        className="block text-white/45"
                                    >
                                        in seconds, not spreadsheets.
                                    </motion.span>
                                </h1>

                                <motion.p
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.7, delay: 0.35 }}
                                    className="mt-2 max-w-xl text-lg leading-relaxed text-white/55 mb-10 hidden lg:block"
                                >
                                    Drop in any bank statement PDF. Our AI extracts every transaction,
                                    categorizes it, and surfaces the spending patterns you keep missing —
                                    privately, instantly, beautifully.
                                </motion.p>

                                {/* Mobile/Tablet Mockup Replica (Visible only on lg:hidden) */}
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.5 }}
                                    className="lg:hidden mt-10 mb-8 w-full flex justify-center items-center h-[270px] mx-auto"
                                >
                                    <div className="relative w-[135px] flex justify-center items-center">
                                        {/* Floating Weekly Report Card on Mobile */}
                                        <div style={{ position: "absolute", right: "calc(100% - 10px)", top: "-15px", zIndex: 35, transform: "scale(0.8)", transformOrigin: "top right", pointerEvents: "none", width: "max-content" }}>
                                            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-2xl bg-[#090e1a] text-zinc-100 border border-blue-500/30 shadow-[0_10px_25px_rgba(0,0,0,0.6),0_0_15px_rgba(59,130,246,0.2)]">
                                                <div className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                                                    <TrendingUp className="w-3 h-3 text-blue-400" />
                                                </div>
                                                <div className="text-left whitespace-nowrap">
                                                    <p className="text-[9px] font-bold leading-tight text-white whitespace-nowrap">Weekly Report</p>
                                                    <p className="text-[8px] font-semibold text-blue-400 leading-tight whitespace-nowrap">You saved 15%!</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Floating Expense Added Card on Mobile */}
                                        <div style={{ position: "absolute", left: "calc(100% - 10px)", top: "45px", zIndex: 30, transform: "scale(0.8)", transformOrigin: "top left", pointerEvents: "none", width: "max-content" }}>
                                            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-2xl bg-[#090e1a] text-zinc-100 border border-rose-500/30 shadow-2xl">
                                                <div className="text-right whitespace-nowrap">
                                                    <p className="text-[9px] font-bold leading-tight text-zinc-100 whitespace-nowrap">Expense Added</p>
                                                    <p className="text-[8px] font-semibold text-rose-400 leading-tight whitespace-nowrap">- ₹1,250</p>
                                                </div>
                                                <div className="w-5 h-5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                                                    <ArrowDownRight className="w-3 h-3 text-rose-400" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* The Phone frame (centered, no bottom notch) */}
                                        <div className="relative z-20 pointer-events-none">
                                            <div style={{ width: 135, background: "#000000", borderRadius: 24, border: "4.5px solid #1a2537", overflow: "hidden", boxShadow: "0 18px 36px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
                                                {/* Screen */}
                                                <div style={{ height: 260, position: "relative", background: "#000000", overflow: "hidden", borderRadius: "18px 18px 0 0" }}>
                                                    {/* iPhone Dynamic Island / Notch */}
                                                    <div style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", width: 46, height: 14, background: "#000000", borderBottomLeftRadius: 9, borderBottomRightRadius: 9, zIndex: 20, display: "flex", justifyContent: "center", alignItems: "center" }}>
                                                        <div style={{ width: 17, height: 2, background: "#27272a", borderRadius: 2 }} />
                                                    </div>

                                                    {/* iOS Status Bar */}
                                                    <div className="absolute top-0 inset-x-0 h-4 bg-[#000000] flex items-center justify-between px-3.5 z-10 text-white">
                                                        <div className="text-[7px] font-semibold mt-0.5">9:41</div>
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <Signal className="w-1.5 h-1.5" />
                                                            <Wifi className="w-1.5 h-1.5" />
                                                            <Battery className="w-2 h-2" />
                                                        </div>
                                                    </div>

                                                    <div className="w-full h-[calc(100%-16px)] mt-[16px]">
                                                        <img src="/phone-screen.png" style={{ imageRendering: "crisp-edges" }} onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop"; }} className="w-full h-full object-fill contrast-[1.08] brightness-[1.02]" alt="Phone screen" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Floating Budget on Track Pill Badge on Mobile */}
                                        <div style={{ position: "absolute", right: "calc(100% - 10px)", top: "185px", zIndex: 35, transform: "scale(0.8)", transformOrigin: "bottom right", pointerEvents: "none", width: "max-content" }}>
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500 text-white font-bold border border-emerald-400/50 shadow-[0_10px_24px_rgba(16,185,129,0.45)]">
                                                <div className="w-3.5 h-3.5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                                    <CircleDollarSign className="w-2.5 h-2.5 text-white" />
                                                </div>
                                                <span className="text-[9px] font-bold text-white whitespace-nowrap">Budget on track!</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>

                                <div className="flex flex-row items-center justify-center lg:justify-start gap-2 w-full max-w-[260px] mx-auto lg:max-w-none lg:mx-0">
                                    <button
                                        onClick={() => setShowLogin(true)}
                                        className="flex-1 lg:flex-none px-2 py-1.5 lg:px-5 lg:py-2.5 rounded-full bg-emerald-500 text-white text-[10px] lg:text-sm font-bold hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-105 transition-all duration-300 flex items-center justify-center gap-1.5 group"
                                    >
                                        <span className="whitespace-nowrap">Get Started Free</span>
                                    </button>

                                    <button
                                        onClick={() => setIsCalculatorOpen(true)}
                                        className="flex-1 lg:flex-none px-2 py-1.5 lg:px-5 lg:py-2.5 rounded-full border border-white/20 text-white text-[10px] lg:text-sm font-bold hover:bg-white/5 transition-colors flex items-center justify-center group"
                                    >
                                        <span className="whitespace-nowrap lg:hidden">Free Calculator</span>
                                        <span className="hidden lg:inline whitespace-nowrap">Use Free Financial Calculator</span>
                                    </button>
                                </div>
                            </div>

                            {/* Right Column - Mockups */}
                            <div className="flex-1 relative h-[460px] w-full max-w-3xl hidden lg:block mt-4">
                                {/* FLOATING WEEKLY REPORT BADGE (Left side of phone, desktop view) */}
                                <div style={{ position: "absolute", left: "-8%", top: "20px", zIndex: 45, transform: "scale(0.85)", transformOrigin: "top left", pointerEvents: "none", width: "max-content" }}>
                                    <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-[#090e1a] text-zinc-100 border border-blue-500/30 shadow-[0_16px_40px_rgba(0,0,0,0.8),0_0_24px_rgba(59,130,246,0.2)]">
                                        <div className="w-8 h-8 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                                            <TrendingUp className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <div className="text-left whitespace-nowrap">
                                            <p className="text-xs font-bold leading-tight text-white whitespace-nowrap">Weekly Report</p>
                                            <p className="text-[11px] font-semibold text-blue-400 leading-tight whitespace-nowrap">You saved 15%!</p>
                                        </div>
                                    </div>
                                </div>
                                {/* FLOATING EXPENSE ADDED BADGE (Dark theme, right side) */}
                                <div style={{ position: "absolute", right: "-3%", top: "150px", zIndex: 45, transform: "scale(0.75)", transformOrigin: "top right", pointerEvents: "none" }}>
                                    <div>
                                        <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-[#090e1a] text-zinc-100 border border-rose-500/30 shadow-[0_16px_40px_rgba(0,0,0,0.8),0_0_24px_rgba(244,63,94,0.15)]">
                                            <div className="w-8 h-8 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                                                <ArrowDownRight className="w-4.5 h-4.5 text-rose-400" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold leading-tight text-zinc-100">Expense Added</p>
                                                <p className="text-[11px] font-semibold text-rose-400 leading-tight">- ₹1,250 · Groceries</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* FLOATING BUDGET ON TRACK PILL BADGE (Bottom left of mobile phone) */}
                                <div style={{ position: "absolute", left: "-10%", top: "365px", zIndex: 45, transform: "scale(0.85)", transformOrigin: "bottom left", pointerEvents: "none" }}>
                                    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500 text-white font-bold border border-emerald-400/50 shadow-[0_12px_28px_rgba(16,185,129,0.45)]">
                                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                            <CircleDollarSign className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        <span className="text-xs font-bold text-white whitespace-nowrap">Budget on track!</span>
                                    </div>
                                </div>

                                {/* LAPTOP (back, right-aligned) */}
                                <div style={{ position: "absolute", right: 0, top: 40, zIndex: 20 }}>
                                    {/* Screen lid */}
                                    <div style={{ width: 440, background: "#060a14", borderRadius: "10px 10px 0 0", padding: "9px 9px 0 9px", border: "1.5px solid rgba(255,255,255,0.09)", borderBottom: "none", position: "relative", boxShadow: "0 24px 56px rgba(0,0,0,0.7)" }}>
                                        {/* Webcam dot */}
                                        <div style={{ position: "absolute", top: 4, left: "50%", transform: "translateX(-50%)", width: 5, height: 5, borderRadius: "50%", background: "#1e293b", border: "1px solid rgba(255,255,255,0.06)", zIndex: 10 }} />
                                        {/* Screen */}
                                        <div style={{ height: 260, background: "#020617", overflow: "hidden", borderRadius: "2px 2px 0 0", position: "relative" }}>
                                            <img src="/laptop-screen.png" onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=800&auto=format&fit=crop"; }} className="w-full h-full object-cover" alt="Laptop screen" />
                                            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(130deg, rgba(255,255,255,0.07) 0%, transparent 55%)", pointerEvents: "none" }} />
                                        </div>
                                    </div>
                                    {/* Hinge — same 440px */}
                                    <div style={{ width: 440, height: 5, background: "linear-gradient(to bottom, #1e293b, #0d111c)" }} />
                                    {/* Keyboard base — same 440px, no clip-path */}
                                    <div style={{ width: 440, background: "linear-gradient(180deg, #18243a 0%, #0d1a2b 50%, #080e1a 100%)", borderRadius: "0 0 8px 8px", padding: "10px 18px 14px", boxShadow: "0 24px 48px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08)" }}>
                                        {/* Keyboard recess */}
                                        <div style={{ background: "#04060e", borderRadius: 4, border: "1px solid rgba(255,255,255,0.05)", padding: "6px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
                                            {/* Function row */}
                                            <div style={{ display: "flex", gap: 2 }}>
                                                {Array.from({ length: 13 }).map((_, i) => <div key={i} style={{ flex: 1, height: 6, background: "rgba(100,116,139,0.20)", borderRadius: 1.5 }} />)}
                                            </div>
                                            {/* Alpha rows */}
                                            {[14, 14, 13].map((count, row) => (
                                                <div key={row} style={{ display: "flex", gap: 2 }}>
                                                    {row === 2 && <div style={{ width: 22, height: 8, background: "rgba(100,116,139,0.22)", borderRadius: 1.5 }} />}
                                                    {Array.from({ length: count }).map((_, i) => <div key={i} style={{ flex: 1, height: 8, background: "rgba(100,116,139,0.22)", borderRadius: 1.5 }} />)}
                                                    {row === 2 && <div style={{ width: 22, height: 8, background: "rgba(100,116,139,0.22)", borderRadius: 1.5 }} />}
                                                </div>
                                            ))}
                                            {/* Spacebar row */}
                                            <div style={{ display: "flex", gap: 2 }}>
                                                {[20, 20, 20].map((w, i) => <div key={i} style={{ width: w, height: 8, background: "rgba(100,116,139,0.22)", borderRadius: 1.5 }} />)}
                                                <div style={{ flex: 1, height: 8, background: "rgba(100,116,139,0.28)", borderRadius: 1.5 }} />
                                                {[20, 20, 20].map((w, i) => <div key={i} style={{ width: w, height: 8, background: "rgba(100,116,139,0.22)", borderRadius: 1.5 }} />)}
                                            </div>
                                        </div>
                                        {/* Trackpad */}
                                        <div style={{ width: 110, height: 22, margin: "8px auto 0", background: "rgba(100,116,139,0.07)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 3 }} />
                                    </div>
                                </div>

                                {/* PHONE (front, overlapping laptop left side, no bottom notch) */}
                                <div style={{ position: "absolute", left: "10%", top: 40, zIndex: 30 }}>
                                    <div style={{ width: 200, background: "#000000", borderRadius: 32, border: "6px solid #1a2537", overflow: "hidden", boxShadow: "0 32px 64px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
                                        {/* Screen */}
                                        <div style={{ height: 390, position: "relative", background: "#000000", overflow: "hidden", borderRadius: "26px 26px 0 0" }}>
                                            {/* iPhone Dynamic Island / Notch */}
                                            <div style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", width: 70, height: 22, background: "#000000", borderBottomLeftRadius: 12, borderBottomRightRadius: 12, zIndex: 20, display: "flex", justifyContent: "center", alignItems: "center" }}>
                                                <div style={{ width: 24, height: 3, background: "#27272a", borderRadius: 2 }} />
                                            </div>

                                            {/* iOS Status Bar */}
                                            <div className="absolute top-0 inset-x-0 h-6 bg-[#000000] flex items-center justify-between px-5 z-10 text-white">
                                                <div className="text-[9px] font-semibold mt-1">9:41</div>
                                                <div className="flex items-center gap-[2px] mt-1">
                                                    <Signal className="w-2.5 h-2.5" />
                                                    <Wifi className="w-2.5 h-2.5" />
                                                    <Battery className="w-3.5 h-3.5" />
                                                </div>
                                            </div>

                                            <div className="w-full h-[calc(100%-24px)] mt-[24px]">
                                                <img src="/phone-screen.png" style={{ imageRendering: "crisp-edges" }} onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop"; }} className="w-full h-full object-fill contrast-[1.08] brightness-[1.02]" alt="Phone screen" />
                                            </div>
                                        </div>
                                    </div>
                                </div>




                                {/* SCANNING ANIMATION — floating above the laptop on the right */}
                                <div style={{ position: "absolute", right: "40px", top: "-20px", zIndex: 40, width: 60, height: 60 }}>
                                    {mounted && scanAnimation && <Lottie
                                        animationData={scanAnimation}
                                        loop={true}
                                        style={{ width: "100%", height: "100%" }}
                                    />}
                                    {/* Floating 'AI Scanning' inside the scanning lines */}
                                    <div className="absolute top-[32%] left-1/2 -translate-x-1/2 text-[6px] font-black text-emerald-400 bg-[#070b13]/90 border border-emerald-500/40 px-1.5 py-0.2 rounded shadow-[0_0_6px_rgba(16,185,129,0.3)] tracking-wider uppercase whitespace-nowrap">
                                        AI Scanning
                                    </div>
                                </div>

                                <style>{`
                            @keyframes devFloatLaptop { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
                            @keyframes devFloatPhone  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
                            @keyframes devFloatScan   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
                            @keyframes svgFloatLeft   {
                                0%,100% { transform: translateY(0) rotate(-2deg) scale(1); }
                                50%     { transform: translateY(-10px) rotate(2deg) scale(1.03); }
                            }
                            @keyframes svgFloatRight  {
                                0%,100% { transform: translateY(0) rotate(4deg) scale(1); }
                                50%     { transform: translateY(-10px) rotate(-2deg) scale(1.05); }
                            }
                            @keyframes ringSpinRight  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                            @keyframes cubeFloatLeft {
                                0%   { transform: translateX(-50%) translateY(0px)   rotate(-1deg) scaleX(1); }
                                30%  { transform: translateX(-50%) translateY(-8px)  rotate(1.5deg) scaleX(1.01); }
                                60%  { transform: translateX(-50%) translateY(-14px) rotate(-0.5deg) scaleX(0.99); }
                                100% { transform: translateX(-50%) translateY(0px)   rotate(-1deg) scaleX(1); }
                            }
                            @keyframes cubeFloatRight {
                                0%   { transform: translateY(0px)   rotate(1deg) scaleX(1); }
                                35%  { transform: translateY(-10px) rotate(-1deg) scaleX(1.01); }
                                65%  { transform: translateY(-16px) rotate(0.8deg) scaleX(0.99); }
                                100% { transform: translateY(0px)   rotate(1deg) scaleX(1); }
                            }
                        `}</style>
                            </div>
                        </div>

                    </div>
                    {/* Slide 2 Removed -> Moved to Modal */}

                    {/* Scroll Down Indicator (3 Arrows) */}
                    <motion.div style={{ opacity: scrollOpacity }} className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 lg:hidden pointer-events-none z-20">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.5, duration: 1 }}
                            className="flex flex-col items-center gap-1"
                        >
                            <div className="flex flex-col items-center -space-y-2.5">
                                <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0 }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-800">
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </motion.div>
                                <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.15 }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </motion.div>
                                <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </motion.div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>


                {/* ===== FEATURES SECTION (Spendee-style) ===== */}
                <div className="w-full px-8 lg:px-16 py-16 lg:py-20 space-y-20 lg:space-y-24 max-w-[1600px] mx-auto">
                    {/* --- Header & Cards Group Wrapper --- */}
                    <div className="space-y-8 lg:space-y-12">
                        {/* --- Section header --- */}
                        <motion.div
                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                            whileInView={{ opacity: 1, y: 0, scale: 1 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                            className="text-center max-w-2xl mx-auto"
                        >
                            <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-4">
                                Your complete <span className="text-emerald-400">financial</span> command center
                            </h2>
                            <p className="text-zinc-400 text-base leading-relaxed">
                                One app to track spending, set budgets, analyse patterns, and achieve every financial goal you set.
                            </p>
                        </motion.div>

                        {/* --- 3 Highlight cards (Spendee top strip) --- */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 max-w-5xl mx-auto">
                            {[
                                {
                                    icon: "📄",
                                    title: "Add Transactions Your Way",
                                    desc: "Enter transactions manually in seconds, or upload your bank's PDF statement — our AI extracts and categorises everything automatically.",
                                    accent: "#10b981",
                                    glow: "rgba(16, 185, 129, 0.06)",
                                },
                                {
                                    icon: "🧠",
                                    title: "AI-Powered Budget Analysis",
                                    desc: "Let AI analyse your spending patterns and generate a personalised budget breakdown — no guesswork, just clear financial direction.",
                                    accent: "#8b5cf6",
                                    glow: "rgba(139, 92, 246, 0.06)",
                                },
                                {
                                    icon: "🔒",
                                    title: "Data Security & PDF Export",
                                    desc: "Your data is encrypted end-to-end and stays private. Export any report as a polished PDF whenever you need it.",
                                    accent: "#f59e0b",
                                    glow: "rgba(245, 158, 11, 0.06)",
                                },
                            ].map((card, index) => (
                                <motion.div
                                    key={card.title}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-50px" }}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                    className="group relative rounded-xl border p-3.5 sm:p-4 transition-all duration-300 hover:-translate-y-1"
                                    style={{ background: card.glow, borderColor: card.accent + "30" }}
                                >
                                    <div className="flex items-center justify-between gap-2.5 mb-2">
                                        <h3 className="text-sm font-bold text-white leading-tight">{card.title}</h3>
                                        <span className="text-lg shrink-0">{card.icon}</span>
                                    </div>
                                    <p className="text-zinc-400 text-xs leading-relaxed">{card.desc}</p>
                                    <div className="absolute bottom-0 left-0 right-0 h-px rounded-full opacity-40" style={{ background: `linear-gradient(90deg, transparent, ${card.accent}, transparent)` }} />
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* --- Step 1: Track Everything (visual left, text right) --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center py-10 lg:py-14" suppressHydrationWarning>
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="relative flex items-center justify-center order-2 lg:order-1"
                        >
                            <div className="relative w-full max-w-sm">
                                <div className="absolute -inset-6 bg-emerald-500/10 rounded-3xl blur-2xl pointer-events-none" />
                                <div className="relative bg-[#0d1424] border border-emerald-500/20 rounded-2xl p-5 shadow-2xl space-y-3">
                                    {/* Header */}
                                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                                        <div>
                                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Live Expense Breakdown</p>
                                            <p className="text-xl font-black text-white mt-0.5">₹42,500 <span className="text-[10px] text-emerald-400 font-medium ml-1">↓ 12% vs last month</span></p>
                                        </div>
                                        <div className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                                            Live Tracker
                                        </div>
                                    </div>

                                    {/* SVG Graph with Expense Amount Tooltip Badges on Points */}
                                    <div className="relative pt-1">
                                        <svg viewBox="0 0 380 185" className="w-full h-auto overflow-visible">
                                            <defs>
                                                <linearGradient id="gridChartGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                                                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                                                </linearGradient>
                                            </defs>

                                            {/* Horizontal Grid Lines */}
                                            <line x1="30" y1="30" x2="360" y2="30" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                                            <line x1="30" y1="75" x2="360" y2="75" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                                            <line x1="30" y1="120" x2="360" y2="120" stroke="rgba(255,255,255,0.08)" />

                                            {/* Y-Axis Labels */}
                                            <text x="0" y="34" fill="#64748b" fontSize="9" fontWeight="600">₹50k</text>
                                            <text x="0" y="79" fill="#64748b" fontSize="9" fontWeight="600">₹25k</text>
                                            <text x="0" y="124" fill="#64748b" fontSize="9" fontWeight="600">₹0</text>

                                            {/* X-Axis Labels */}
                                            <text x="50" y="142" fill="#64748b" fontSize="9" fontWeight="600">Mon</text>
                                            <text x="140" y="142" fill="#64748b" fontSize="9" fontWeight="600">Wed</text>
                                            <text x="230" y="142" fill="#64748b" fontSize="9" fontWeight="600">Fri</text>
                                            <text x="320" y="142" fill="#64748b" fontSize="9" fontWeight="600">Sun</text>

                                            {/* Filled Area Under Curve */}
                                            <path d="M 30,120 L 60,100 L 150,65 L 240,80 L 330,35 L 330,120 Z" fill="url(#gridChartGrad)" />

                                            {/* Main Curve Line */}
                                            <path d="M 30,120 L 60,100 L 150,65 L 240,80 L 330,35" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                                            {/* --- Data Points & Expense Amount Badges --- */}
                                            
                                            {/* Point 1: Mon - Swiggy ₹450 */}
                                            <g>
                                                <rect x="28" y="72" width="65" height="18" rx="5" fill="#0f172a" stroke="rgba(16,185,129,0.35)" strokeWidth="1" />
                                                <text x="60" y="84" fill="#34d399" fontSize="8.5" fontWeight="700" textAnchor="middle">Swiggy ₹450</text>
                                                <circle cx="60" cy="100" r="4" fill="#10b981" stroke="#064e3b" strokeWidth="2" />
                                            </g>

                                            {/* Point 2: Wed - Shopping ₹4.2k */}
                                            <g>
                                                <rect x="110" y="37" width="80" height="18" rx="5" fill="#0f172a" stroke="rgba(16,185,129,0.35)" strokeWidth="1" />
                                                <text x="150" y="49" fill="#34d399" fontSize="8.5" fontWeight="700" textAnchor="middle">Shopping ₹4.2k</text>
                                                <circle cx="150" cy="65" r="4" fill="#10b981" stroke="#064e3b" strokeWidth="2" />
                                            </g>

                                            {/* Point 3: Fri - Fuel ₹1.8k */}
                                            <g>
                                                <rect x="208" y="52" width="64" height="18" rx="5" fill="#0f172a" stroke="rgba(16,185,129,0.35)" strokeWidth="1" />
                                                <text x="240" y="64" fill="#34d399" fontSize="8.5" fontWeight="700" textAnchor="middle">Fuel ₹1.8k</text>
                                                <circle cx="240" cy="80" r="4" fill="#10b981" stroke="#064e3b" strokeWidth="2" />
                                            </g>

                                            {/* Point 4: Sun - Salary +₹65k */}
                                            <g>
                                                <rect x="290" y="8" width="74" height="18" rx="5" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
                                                <text x="327" y="20" fill="#a7f3d0" fontSize="8.5" fontWeight="800" textAnchor="middle">Salary +₹65k</text>
                                                <circle cx="330" cy="35" r="5" fill="#34d399" stroke="#064e3b" strokeWidth="2" />
                                            </g>
                                        </svg>
                                    </div>

                                    {/* Recent Transactions List inside card */}
                                    <div className="pt-2 border-t border-white/5 space-y-2">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <div className="flex items-center gap-2">
                                                <span className="w-5 h-5 rounded-md bg-emerald-500/10 flex items-center justify-center text-[10px]">🛒</span>
                                                <span className="text-zinc-200 font-medium">Zepto Groceries</span>
                                            </div>
                                            <span className="text-zinc-400 font-semibold">-₹450</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px]">
                                            <div className="flex items-center gap-2">
                                                <span className="w-5 h-5 rounded-md bg-emerald-500/10 flex items-center justify-center text-[10px]">💼</span>
                                                <span className="text-zinc-200 font-medium">Monthly Salary</span>
                                            </div>
                                            <span className="text-emerald-400 font-semibold">+₹65,000</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                            className="space-y-5 order-1 lg:order-2"
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5">
                                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Step 01 — Track</span>
                            </div>
                            <h3 className="text-2xl lg:text-3xl font-extrabold text-white leading-tight">
                                See every  <span className="text-emerald-400">money</span> <br />in real time
                            </h3>
                            <p className="text-zinc-400 leading-relaxed">
                                Scan receipts with AI, or add entries manually. Every transaction is automatically categorised so you always know where your money goes without lifting a finger.
                            </p>
                            <ul className="space-y-3">
                                {["Auto-categorised transactions", "PDF bank statement import", "AI receipt scanner"].map(item => (
                                    <li key={item} className="flex items-center gap-3 text-sm text-zinc-300">
                                        <span className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 text-emerald-400 text-xs">✓</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    </div>

                    {/* --- Step 2: Budget Smarter (visual left, text right — aligned with Step 1 and 3) --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center py-10 lg:py-14" suppressHydrationWarning>
                        {/* LEFT — visual card */}
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="relative flex items-center justify-center order-2 lg:order-1"
                        >
                            <div className="relative w-full max-w-sm">
                                <div className="absolute -inset-6 bg-violet-500/10 rounded-3xl blur-2xl pointer-events-none" />
                                <div className="relative bg-[#0d1424] border border-violet-500/20 rounded-2xl p-5 shadow-2xl">
                                    <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">Budget Status — June</div>
                                    {[
                                        { cat: "Shopping", used: 7239, total: 9000, color: "#818cf8" },
                                        { cat: "Food & Drink", used: 3410, total: 5000, color: "#10b981" },
                                        { cat: "Transport", used: 1200, total: 2000, color: "#f59e0b" },
                                        { cat: "Entertainment", used: 890, total: 1500, color: "#ec4899" },
                                    ].map(({ cat, used, total, color }, index) => {
                                        const pct = Math.round((used / total) * 100);
                                        return (
                                            <motion.div
                                                key={cat}
                                                className="mb-4 p-1 rounded-lg transition-colors hover:bg-white/[0.02]"
                                                whileHover={{ x: 5 }}
                                                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                                            >
                                                <div className="flex justify-between items-baseline mb-1.5">
                                                    <span className="text-xs font-semibold text-zinc-300">{cat}</span>
                                                    <span className="text-[10px] text-zinc-400">₹{used.toLocaleString()} / ₹{total.toLocaleString()}</span>
                                                </div>
                                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                                    <motion.div
                                                        className="h-full rounded-full"
                                                        initial={{ width: 0 }}
                                                        whileInView={{ width: `${pct}%` }}
                                                        viewport={{ once: true }}
                                                        transition={{ duration: 1.2, ease: "easeOut", delay: index * 0.1 }}
                                                        style={{ background: pct > 80 ? "#ef4444" : color }}
                                                    />
                                                </div>
                                                <div className="text-[9px] mt-1" style={{ color: pct > 80 ? "#ef4444" : "#52525b" }}>
                                                    {pct}% used {pct > 80 ? "⚠️ Near limit" : ""}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>

                        {/* RIGHT — text content */}
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                            className="space-y-5 order-1 lg:order-2"
                        >
                            <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full border border-violet-500/20 bg-violet-500/5">
                                <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">Step 02 — Budget</span>
                            </div>
                            <h3 className="text-2xl lg:text-3xl font-extrabold text-white leading-tight">
                                Set limits that <br />actually work
                            </h3>
                            <p className="text-zinc-400 leading-relaxed">
                                Create monthly budgets per category and get notified when you overspend. FinanceNeo's smart alerts give you enough time to course-correct.
                            </p>
                            <ul className="space-y-3">
                                {["Per-category budget limits", "Real-time spend alerts", "Daily allowance calculator", "Rollover unused budget"].map(item => (
                                    <li key={item} className="flex items-center gap-3 text-sm text-zinc-300">
                                        <span className="w-5 h-5 rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center flex-shrink-0 text-violet-400 text-xs">✓</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    </div>

                    {/* --- Step 3: Chat with FinanceNeo AI (visual left, text right) --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center py-10 lg:py-14" suppressHydrationWarning>
                        {/* LEFT — animated chat UI */}
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="relative flex items-center justify-center order-2 lg:order-1"
                        >
                            <div className="relative w-full max-w-sm">
                                <div className="absolute -inset-6 bg-emerald-500/10 rounded-3xl blur-2xl pointer-events-none" />
                                {/* Chat window */}
                                <div className="relative bg-[#0a0f1e] border border-emerald-500/20 rounded-2xl overflow-hidden shadow-2xl" style={{ minHeight: 380 }}>
                                    {/* Header */}
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0d1424]">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-sm">🤖</div>
                                            <div>
                                                <div className="text-sm font-bold text-white leading-none">Chat with FinanceNeo</div>

                                            </div>
                                        </div>
                                        <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 text-xs">✕</div>
                                    </div>

                                    {/* Messages — looping infinite chat cycle (16s per loop) */}
                                    <div className="p-4 overflow-y-auto chat-scroll flex flex-col" style={{ height: 290 }} tabIndex={0}>
                                        {/* AI msg 1 */}
                                        <div className="flex items-end gap-2" style={{ animation: "chatMsg1 16s ease infinite" }}>
                                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs flex-shrink-0">🤖</div>
                                            <div className="bg-[#131d30] border border-white/[0.06] rounded-2xl rounded-bl-sm px-3.5 py-2.5 max-w-[80%]">
                                                <p className="text-xs text-zinc-200 leading-relaxed">Hey! I&apos;m FinanceNeo AI 👋 Ask me anything about your money.</p>
                                            </div>
                                        </div>

                                        {/* User msg 1 */}
                                        <div className="flex items-end gap-2 justify-end mt-3" style={{ animation: "chatMsg2 16s ease infinite" }}>
                                            <div className="bg-emerald-600/25 border border-emerald-500/25 rounded-2xl rounded-br-sm px-3.5 py-2.5 max-w-[78%]">
                                                <p className="text-xs text-emerald-100 leading-relaxed">Where did most of my money go this month?</p>
                                            </div>
                                            <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs flex-shrink-0">👤</div>
                                        </div>

                                        {/* Typing 1 */}
                                        <div className="overflow-hidden" style={{ animation: "typing1 16s ease infinite" }}>
                                            <div className="flex items-end gap-2 mt-3">
                                                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs flex-shrink-0">🤖</div>
                                                <div className="bg-[#131d30] border border-white/[0.06] rounded-2xl rounded-bl-sm px-4 py-3">
                                                    <div className="flex gap-1 items-center h-4">
                                                        <span className="block w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: "typingDot 1.4s infinite ease-in-out", animationDelay: "0s" }} />
                                                        <span className="block w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: "typingDot 1.4s infinite ease-in-out", animationDelay: "0.2s" }} />
                                                        <span className="block w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: "typingDot 1.4s infinite ease-in-out", animationDelay: "0.4s" }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* AI reply */}
                                        <div className="flex items-end gap-2 mt-3" style={{ animation: "chatMsg3 16s ease infinite" }}>
                                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs flex-shrink-0">🤖</div>
                                            <div className="bg-[#131d30] border border-white/[0.06] rounded-2xl rounded-bl-sm px-3.5 py-2.5 max-w-[80%]">
                                                <p className="text-xs text-zinc-200 leading-relaxed">🍔 <span className="text-emerald-400 font-semibold">Food &amp; Dining</span> — 34% (₹8,200). Want a budget cap?</p>
                                            </div>
                                        </div>

                                        {/* User reply 2 */}
                                        <div className="flex items-end gap-2 justify-end mt-3" style={{ animation: "chatMsg4 16s ease infinite" }}>
                                            <div className="bg-emerald-600/25 border border-emerald-500/25 rounded-2xl rounded-br-sm px-3.5 py-2.5 max-w-[78%]">
                                                <p className="text-xs text-emerald-100 leading-relaxed">Yes! Set ₹6,000 limit 🙏</p>
                                            </div>
                                            <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs flex-shrink-0">👤</div>
                                        </div>

                                        {/* Typing 2 */}
                                        <div className="overflow-hidden" style={{ animation: "typing2 16s ease infinite" }}>
                                            <div className="flex items-end gap-2 mt-3">
                                                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs flex-shrink-0">🤖</div>
                                                <div className="bg-[#131d30] border border-white/[0.06] rounded-2xl rounded-bl-sm px-4 py-3">
                                                    <div className="flex gap-1 items-center h-4">
                                                        <span className="block w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: "typingDot 1.4s infinite ease-in-out", animationDelay: "0s" }} />
                                                        <span className="block w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: "typingDot 1.4s infinite ease-in-out", animationDelay: "0.2s" }} />
                                                        <span className="block w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: "typingDot 1.4s infinite ease-in-out", animationDelay: "0.4s" }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* AI confirms */}
                                        <div className="flex items-end gap-2 mt-3" style={{ animation: "chatMsg5 16s ease infinite" }}>
                                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs flex-shrink-0">🤖</div>
                                            <div className="bg-[#131d30] border border-white/[0.06] rounded-2xl rounded-bl-sm px-3.5 py-2.5 max-w-[80%]">
                                                <p className="text-xs text-zinc-200 leading-relaxed">✅ Done! I&apos;ll alert you at ₹5,400. Anything else?</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Input bar */}
                                    <div className="px-4 py-3 border-t border-white/[0.06] bg-[#0d1424] flex items-center gap-2">
                                        <div className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-2">
                                            <span className="text-xs text-zinc-400">Ask Neo about your finances...</span>
                                        </div>
                                        <button className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs flex-shrink-0 shadow-lg shadow-emerald-500/30">➤</button>
                                    </div>
                                </div>
                            </div>

                            <style>{`
                                @keyframes chatMsg1 {
                                    0%, 2% { opacity: 0; transform: translateY(6px); }
                                    5%, 90% { opacity: 1; transform: translateY(0); }
                                    93%, 100% { opacity: 0; transform: translateY(-4px); }
                                }
                                @keyframes chatMsg2 {
                                    0%, 10% { opacity: 0; transform: translateY(6px); }
                                    13%, 90% { opacity: 1; transform: translateY(0); }
                                    93%, 100% { opacity: 0; transform: translateY(-4px); }
                                }
                                @keyframes typing1 {
                                    0%, 17% { max-height: 0; opacity: 0; }
                                    18% { max-height: 60px; opacity: 0; transform: translateY(6px); }
                                    20%, 27% { max-height: 60px; opacity: 1; transform: translateY(0); }
                                    29% { max-height: 60px; opacity: 0; transform: translateY(-4px); }
                                    30%, 100% { max-height: 0; opacity: 0; }
                                }
                                @keyframes chatMsg3 {
                                    0%, 29% { opacity: 0; transform: translateY(6px); }
                                    32%, 90% { opacity: 1; transform: translateY(0); }
                                    93%, 100% { opacity: 0; transform: translateY(-4px); }
                                }
                                @keyframes chatMsg4 {
                                    0%, 48% { opacity: 0; transform: translateY(6px); }
                                    51%, 90% { opacity: 1; transform: translateY(0); }
                                    93%, 100% { opacity: 0; transform: translateY(-4px); }
                                }
                                @keyframes typing2 {
                                    0%, 55% { max-height: 0; opacity: 0; }
                                    56% { max-height: 60px; opacity: 0; transform: translateY(6px); }
                                    58%, 65% { max-height: 60px; opacity: 1; transform: translateY(0); }
                                    67% { max-height: 60px; opacity: 0; transform: translateY(-4px); }
                                    68%, 100% { max-height: 0; opacity: 0; }
                                }
                                @keyframes chatMsg5 {
                                    0%, 67% { opacity: 0; transform: translateY(6px); }
                                    70%, 90% { opacity: 1; transform: translateY(0); }
                                    93%, 100% { opacity: 0; transform: translateY(-4px); }
                                }
                                @keyframes typingDot {
                                    0%, 80%, 100% { transform: scale(1); opacity: 0.4; }
                                    40%           { transform: scale(1.4); opacity: 1; }
                                }
                                .chat-scroll::-webkit-scrollbar {
                                    width: 4px;
                                }
                                .chat-scroll::-webkit-scrollbar-track {
                                    background: rgba(0, 0, 0, 0.1);
                                }
                                .chat-scroll::-webkit-scrollbar-thumb {
                                    background: rgba(255, 255, 255, 0.1);
                                    border-radius: 4px;
                                }
                                .chat-scroll::-webkit-scrollbar-thumb:hover {
                                    background: rgba(255, 255, 255, 0.2);
                                }
                            `}</style>
                        </motion.div>

                        {/* RIGHT — copy */}
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                            className="space-y-5 order-1 lg:order-2"
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5">
                                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Step 03 — Ask</span>
                            </div>
                            <h3 className="text-2xl lg:text-3xl font-extrabold text-white leading-tight">
                                Chat with <span className="text-emerald-400">FinanceNeo</span> —<br />your AI money advisor
                            </h3>
                            <p className="text-zinc-400 leading-relaxed">
                                Ask anything in plain English. FinanceNeo AI analyses your real spending data and gives you instant, personalised answers — no spreadsheets, no jargon, just clarity.
                            </p>
                            <ul className="space-y-3">
                                {[
                                    "\"Where did my money go this month?\"",
                                    "\"Am I on track to hit my savings goal?\"",
                                    "\"Set a ₹6,000 food budget for next month\"",
                                    "\"Show me my top 3 unnecessary expenses\"",
                                ].map(item => (
                                    <li key={item} className="flex items-center gap-3 text-sm text-zinc-300">
                                        <span className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 text-emerald-400 text-xs">💬</span>
                                        <span className="italic text-zinc-400">{item}</span>
                                    </li>
                                ))}
                            </ul>
                            <p className="text-xs text-zinc-400 mt-2">Powered by your live transaction data — always accurate, always yours.</p>
                        </motion.div>
                    </div>

                    {/* --- 6-feature capability grid --- */}
                    <div className="pt-16 lg:pt-20">
                        <motion.div
                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                            whileInView={{ opacity: 1, y: 0, scale: 1 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                            className="text-center mb-12"
                        >
                            <h3 className="text-2xl lg:text-3xl font-extrabold text-white mb-3">Built for people who take money seriously</h3>
                            <p className="text-zinc-400 max-w-xl mx-auto text-sm">Every feature is designed to remove friction so you can focus on what matters — building wealth.</p>
                        </motion.div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {[
                                { icon: "📊", title: "Live Analytics", desc: "Beautiful charts that turn raw numbers into actionable stories about your financial life.", color: "#10b981" },
                                { icon: "🔔", title: "Smart Alerts", desc: "Get notified the moment a budget threshold is crossed — before it's too late to fix.", color: "#818cf8" },
                                { icon: "🧾", title: "PDF Scanner", desc: "Upload any bank statement and our AI extracts, categorises, and imports every transaction.", color: "#f59e0b" },
                                { icon: "📱", title: "Mobile-First", desc: "A pixel-perfect mobile experience so you can manage finances on the go, anywhere.", color: "#ec4899" },
                                { icon: "🔒", title: "Private by Design", desc: "Zero-knowledge architecture. Your financial data is encrypted before it leaves your device.", color: "#06b6d4" },
                                { icon: "🤖", title: "AI Finance Advisor", desc: "Ask anything about your finances in plain language and get instant, personalised answers.", color: "#a78bfa" },
                            ].map((feat, index) => (
                                <motion.div
                                    key={feat.title}
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-50px" }}
                                    transition={{ duration: 0.5, delay: index * 0.05 }}
                                    className="group flex gap-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/10 rounded-2xl p-5 transition-all duration-300"
                                >
                                    <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: feat.color + "18", border: `1px solid ${feat.color}30` }}>
                                        {feat.icon}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white mb-1">{feat.title}</h4>
                                        <p className="text-xs text-zinc-400 leading-relaxed">{feat.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- UNIFIED BOTTOM SECTION BREAK WITH DARK THEME (FAQ + FOOTER) --- */}
                <div className="w-screen relative left-1/2 -translate-x-1/2 bg-[#070c18] border-t border-white/[0.08] pt-8 mt-8 overflow-hidden">
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-emerald-500/[0.04] rounded-full blur-[150px] pointer-events-none" />

                    {/* Frequently Asked Questions Content */}
                    <div className="relative z-10 max-w-4xl mx-auto px-8 lg:px-16">
                        <div className="text-center max-w-2xl mx-auto mb-12">
                            <h3 className="text-3xl lg:text-4xl font-extrabold text-white mb-4 tracking-tight">
                                Frequently Asked Questions
                            </h3>
                            <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
                                Everything you need to know about FinanceNeo, security, and smart budget tracking.
                            </p>
                        </div>

                        {/* FAQ Accordion List */}
                        <div className="max-w-2xl mx-auto space-y-2.5">
                            {[
                                {
                                    q: "Is FinanceNeo completely free to use?",
                                    a: "Yes, 100% free! You can track your daily expenses, set up monthly budgets, and check all your financial reports without paying anything or entering a credit card."
                                },
                                {
                                    q: "How secure is my personal financial data?",
                                    a: "Your data is completely safe and private. We use bank-grade encryption to protect your information, and we will never sell or share your data with anyone."
                                },
                                {
                                    q: "How does the automatic AI statement scanner work?",
                                    a: "Just upload your bank statement PDF or receipt photo. Our smart AI instantly reads it, organizes every transaction into categories like Groceries or Bills, and adds it to your dashboard in seconds."
                                },
                                {
                                    q: "Can I download or export my transaction history?",
                                    a: "Yes! You can download your full transaction records to a CSV spreadsheet anytime you want with just one click."
                                },
                                {
                                    q: "Can I set monthly spending limits for my budgets?",
                                    a: "Yes! You can set custom spending limits for Food, Shopping, Bills, and more. FinanceNeo will notify you before you overspend so you stay on track."
                                }
                            ].map((faq, idx) => (
                                <FaqItem key={idx} question={faq.q} answer={faq.a} />
                            ))}
                        </div>
                    </div>

                    {/* Multi-Column Structured Footer (Dark Theme Container) */}
                    <footer className="w-screen relative left-1/2 -translate-x-1/2 bg-[#03060e] border-t border-white/[0.08] pt-14 pb-8 px-8 lg:px-16 mt-20 text-zinc-400 relative z-10">
                        <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 pb-10 border-b border-white/[0.08]">
                            {/* Column 1: Brand & Slogan */}
                            <div className="md:col-span-2 space-y-4 pr-6">
                                <div className="flex items-center gap-3">
                                    <Image
                                        src="/logo.svg"
                                        alt="FinanceNeo Logo"
                                        width={32}
                                        height={32}
                                        className="w-8 h-8 rounded-lg"
                                        priority
                                    />
                                    <span className="text-xl font-extrabold tracking-tight text-white">
                                        Finance<span className="text-emerald-400">Neo</span>
                                    </span>
                                </div>
                                <p className="text-sm text-zinc-400 max-w-sm leading-relaxed">
                                    Smart AI-powered expense tracking and budget management app. Manage your money with confidence.
                                </p>
                            </div>

                            {/* Column 2: Quick Links */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Quick Links</h4>
                                <ul className="space-y-2.5 text-sm">
                                    <li>
                                        <button type="button" onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-emerald-400 transition-colors">
                                            Home
                                        </button>
                                    </li>
                                    <li>
                                        <button type="button" onClick={() => setIsCalculatorOpen(true)} className="hover:text-emerald-400 transition-colors">
                                            Free Calculator
                                        </button>
                                    </li>
                                    <li>
                                        <button type="button" onClick={async () => {
                                            const { data: { user } } = await supabase.auth.getUser();
                                            if (user) { router.push("/dashboard"); } else { setShowLogin(true); }
                                        }} className="hover:text-emerald-400 transition-colors">
                                            Dashboard
                                        </button>
                                    </li>
                                </ul>
                            </div>

                            {/* Column 3: Legal & Support */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Legal</h4>
                                <ul className="space-y-2.5 text-sm">
                                    <li>
                                        <button type="button" onClick={() => { setShowLogin(true); handleSwitchView("privacy"); }} className="hover:text-emerald-400 transition-colors">
                                            Privacy Policy
                                        </button>
                                    </li>
                                    <li>
                                        <button type="button" onClick={() => { setShowLogin(true); handleSwitchView("terms"); }} className="hover:text-emerald-400 transition-colors">
                                            Terms of Use
                                        </button>
                                    </li>
                                    <li>
                                        <Link href="https://abhijeetg.netlify.app" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">
                                            Contact Us
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Bottom copyright line */}
                        <div className="max-w-[1600px] mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-zinc-400">
                            <p>© {new Date().getFullYear()} FinanceNeo. Made with <span className="text-rose-500">❤️</span> by Abhijeet.</p>
                            <p className="text-zinc-400">All rights reserved.</p>
                        </div>
                    </footer>
                </div>
            </motion.div>

            {/* Interactive Login Overlay */}
            {mounted && showLogin && createPortal(
                <AnimatePresence>
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none" tabIndex={0}>
                        <motion.div
                            className="relative z-10 w-full max-w-[360px] sm:max-w-sm bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_0_60px_rgba(0,0,0,0.8)] rounded-2xl p-5 sm:p-6 will-change-transform pointer-events-auto overflow-hidden"
                            initial={{ x: "100vw" }}
                            animate={{ x: "0vw" }}
                            exit={{ x: "100vw" }}
                            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                        >
                            <button
                                onClick={() => {
                                    if (view === "login" || view === "privacy" || view === "terms") {
                                        setShowLogin(false);
                                        setTimeout(() => handleSwitchView("login"), 300);
                                    } else {
                                        handleSwitchView("login");
                                    }
                                }}
                                className="absolute top-3 left-3 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-colors focus:outline-none z-20 flex items-center pr-2.5"
                            >
                                <ChevronLeft className="h-4 w-4 mr-0.5" />
                                <span className="text-xs font-medium">Back</span>
                            </button>

                            {/* X button removed per user request */}

                            <div className="mb-3 mt-4 text-center relative z-10 px-2">
                                <h2 className="text-xl font-bold text-white tracking-tight leading-tight">
                                    {(view === "login" || view === "signup") && <div className="text-xs font-semibold text-zinc-300 mb-0.5">Welcome to</div>}
                                    {view === "forgot_password_email" && "Recover Account"}
                                    {view === "forgot_password_otp" && "Secure Account"}
                                    {view === "privacy" && "Privacy Policy"}
                                    {view === "terms" && "Terms and Conditions"}
                                    {view !== "privacy" && view !== "terms" && (
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-[#4ecca3] text-2xl font-extrabold block">FinanceNeo</span>
                                    )}
                                </h2>
                                <p className="text-zinc-400 text-xs h-4 transition-all mt-1">
                                    {view === "login" && "Please enter your User ID and password to login."}
                                    {view === "signup" && "Create your new account profile."}
                                    {view === "forgot_password_email" && "Enter your email to receive an OTP."}
                                    {view === "forgot_password_otp" && "Reset your password with the code sent."}
                                    {view === "forgot_userid_email" && "Enter your email to recover your User ID."}
                                    {view === "forgot_userid_otp" && "Verify your identity with the code sent."}
                                    {view === "userid_recovered" && "Your identity has been verified."}
                                </p>
                            </div>

                            <div className="relative w-full mt-2">
                                <AnimatePresence mode="wait">

                                    {/* --- STATE 1: LOGIN --- */}
                                    {view === "login" && (
                                        <motion.form
                                            key="login-step"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ duration: 0.3 }}
                                            onSubmit={handleLogin}
                                            className="flex flex-col gap-3 w-full"
                                        >
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center pr-1">
                                                    <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider pl-1">User ID</label>
                                                    <button type="button" onClick={() => handleSwitchView("forgot_userid_email")} className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors">Forgot User ID?</button>
                                                </div>
                                                <input
                                                    type="text" required value={userId} onChange={(e) => setUserId(e.target.value)} disabled={loading}
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium backdrop-blur-sm"
                                                    placeholder="e.g. SatoshiNeo"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center pr-1">
                                                    <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider pl-1">Password</label>
                                                    <button type="button" onClick={() => handleSwitchView("forgot_password_email")} className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors">Forgot Password?</button>
                                                </div>
                                                <div className="relative">
                                                    <input
                                                        type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading}
                                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 pr-9 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium backdrop-blur-sm"
                                                        placeholder="••••••••"
                                                    />
                                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors focus:outline-none">
                                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 mt-0.5">
                                                <input
                                                    type="checkbox"
                                                    id="rememberMe"
                                                    checked={rememberMe}
                                                    onChange={(e) => setRememberMe(e.target.checked)}
                                                    className="w-3.5 h-3.5 rounded border-white/10 bg-black/40 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 transition-colors"
                                                />
                                                <label htmlFor="rememberMe" className="text-xs text-zinc-400 select-none cursor-pointer hover:text-white transition-colors">
                                                    Remember me
                                                </label>
                                            </div>

                                            <button
                                                type="submit" disabled={loading || !userId || !password}
                                                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-emerald-950 font-bold py-2.5 px-3 rounded-lg text-xs sm:text-sm transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] flex items-center justify-center mt-1"
                                            >
                                                {loading ? "Logging In..." : "Log In"}
                                            </button>

                                            <div className="text-center mt-2">
                                                <span className="text-xs text-zinc-400">Don't have an account? </span>
                                                <button type="button" onClick={() => handleSwitchView("signup")} className="text-xs text-emerald-400 font-semibold hover:text-emerald-300 transition-colors">Sign Up</button>
                                            </div>
                                        </motion.form>
                                    )}

                                    {/* --- STATE 2: SIGN UP --- */}
                                    {view === "signup" && (
                                        <motion.form
                                            key="signup-step"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ duration: 0.3 }}
                                            onSubmit={handleSignUp}
                                            className="flex flex-col gap-4 w-full"
                                        >
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1">Recovery Email</label>
                                                <input
                                                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium backdrop-blur-sm"
                                                    placeholder="Used only for password resets"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1">Choose User ID</label>
                                                <input
                                                    type="text" required value={userId} onChange={(e) => setUserId(e.target.value)} disabled={loading}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium backdrop-blur-sm"
                                                    placeholder="Your unique sign-in ID"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1">Choose Username</label>
                                                <input
                                                    type="text" required value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium backdrop-blur-sm"
                                                    placeholder="e.g. SatoshiNeo"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1">Secure Password</label>
                                                <div className="relative">
                                                    <input
                                                        type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} minLength={6}
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pr-10 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium backdrop-blur-sm"
                                                    />
                                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors focus:outline-none">
                                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                    </button>
                                                </div>
                                            </div>

                                            <button
                                                type="submit" disabled={loading || !email || !password || !userId || username.length < 3}
                                                className="w-full bg-teal-500 hover:bg-teal-400 disabled:bg-teal-500/50 text-emerald-950 font-bold py-4 px-4 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)] flex items-center justify-center mt-2"
                                            >
                                                {loading ? "Creating Profile..." : "Create Account"}
                                            </button>

                                            <div className="text-center mt-4">
                                                <span className="text-sm text-zinc-400">Already a member? </span>
                                                <button type="button" onClick={() => handleSwitchView("login")} className="text-sm text-emerald-400 font-semibold hover:text-emerald-300 transition-colors">Log In Instead</button>
                                            </div>
                                        </motion.form>
                                    )}

                                    {/* --- STATE 3A: FORGOT PASSWORD (EMAIL) --- */}
                                    {view === "forgot_password_email" && (
                                        <motion.form
                                            key="forgot-step-email"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ duration: 0.3 }}
                                            onSubmit={handleSendRecoveryOTP}
                                            className="flex flex-col gap-4 w-full"
                                        >
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1">Account Email</label>
                                                <input
                                                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium backdrop-blur-sm"
                                                    placeholder="you@example.com"
                                                />
                                            </div>

                                            <button
                                                type="submit" disabled={loading || !email}
                                                className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-yellow-500/50 text-yellow-950 font-bold py-4 px-4 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_30px_rgba(234,179,8,0.5)] flex items-center justify-center mt-2"
                                            >
                                                {loading ? "Sending..." : "Send Recovery OTP"}
                                            </button>

                                            <div className="text-center mt-4">
                                                <button type="button" onClick={() => handleSwitchView("login")} className="text-sm text-zinc-400 font-semibold hover:text-white transition-colors">&larr; Back to Login</button>
                                            </div>
                                        </motion.form>
                                    )}

                                    {/* --- STATE 3B: FORGOT PASSWORD (OTP + NEW PASSWWORD) --- */}
                                    {view === "forgot_password_otp" && (
                                        <motion.form
                                            key="forgot-step-otp"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ duration: 0.3 }}
                                            onSubmit={handleResetPassword}
                                            className="flex flex-col gap-4 w-full"
                                        >
                                            <div className="space-y-1 flex flex-col items-center">
                                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 self-start pl-1">Recovery Code</label>
                                                <div className="flex gap-2 sm:gap-3 w-full justify-between">
                                                    {otp.map((digit, index) => (
                                                        <input
                                                            key={index} ref={(el) => { inputRefs.current[index] = el; }}
                                                            type="text" maxLength={1} value={digit}
                                                            onChange={(e) => handleOtpChange(index, e.target.value)}
                                                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                                            disabled={loading}
                                                            className="w-full h-12 text-center text-xl font-bold bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 transition-all backdrop-blur-sm"
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-1 flex-1">
                                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1">New Password</label>
                                                <div className="relative">
                                                    <input
                                                        type={showNewPassword ? "text" : "password"} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={loading} minLength={6}
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pr-10 text-white focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 transition-all font-medium backdrop-blur-sm"
                                                    />
                                                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors focus:outline-none">
                                                        {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-1 flex-1">
                                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1">Confirm New Password</label>
                                                <div className="relative">
                                                    <input
                                                        type={showConfirmPassword ? "text" : "password"} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} minLength={6}
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pr-10 text-white focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 transition-all font-medium backdrop-blur-sm"
                                                    />
                                                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors focus:outline-none">
                                                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                    </button>
                                                </div>
                                            </div>

                                            <button
                                                type="submit" disabled={loading || otp.join("").length !== 6 || !newPassword || !confirmPassword}
                                                className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-yellow-500/50 text-yellow-950 font-bold py-4 px-4 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_30px_rgba(234,179,8,0.5)] flex items-center justify-center mt-2"
                                            >
                                                {loading ? "Decrypting Vault..." : "Reset & Log In"}
                                            </button>
                                        </motion.form>
                                    )}

                                    {/* --- STATE 4A: FORGOT USER ID (EMAIL) --- */}
                                    {view === "forgot_userid_email" && (
                                        <motion.form
                                            key="forgot-userid-email"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ duration: 0.3 }}
                                            onSubmit={handleSendUserIdRecoveryOTP}
                                            className="flex flex-col gap-4 w-full"
                                        >
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1">Account Email</label>
                                                <input
                                                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all font-medium backdrop-blur-sm"
                                                    placeholder="you@example.com"
                                                />
                                            </div>

                                            <button
                                                type="submit" disabled={loading || !email}
                                                className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-500/50 text-cyan-950 font-bold py-4 px-4 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] flex items-center justify-center mt-2"
                                            >
                                                {loading ? "Sending..." : "Recover User ID"}
                                            </button>

                                            <div className="text-center mt-4">
                                                <button type="button" onClick={() => handleSwitchView("login")} className="text-sm text-zinc-400 font-semibold hover:text-white transition-colors">&larr; Back to Login</button>
                                            </div>
                                        </motion.form>
                                    )}

                                    {/* --- STATE 4B: FORGOT USER ID (OTP VERIFICATION) --- */}
                                    {view === "forgot_userid_otp" && (
                                        <motion.form
                                            key="forgot-userid-otp"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ duration: 0.3 }}
                                            onSubmit={handleRecoverUserIdOTP}
                                            className="flex flex-col gap-6 w-full"
                                        >
                                            <div className="space-y-1 flex flex-col items-center mt-2">
                                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 self-start pl-1">Recovery Code</label>
                                                <div className="flex gap-2 sm:gap-3 w-full justify-between">
                                                    {otp.map((digit, index) => (
                                                        <input
                                                            key={index} ref={(el) => { inputRefs.current[index] = el; }}
                                                            type="text" maxLength={1} value={digit}
                                                            onChange={(e) => handleOtpChange(index, e.target.value)}
                                                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                                            disabled={loading}
                                                            className="w-full h-12 text-center text-xl font-bold bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all backdrop-blur-sm"
                                                        />
                                                    ))}
                                                </div>
                                                <p className="text-xs text-zinc-400 mt-3 self-start pl-1">
                                                    Check your email for the 6-digit security code.
                                                </p>
                                            </div>

                                            <button
                                                type="submit" disabled={loading || otp.join("").length !== 6}
                                                className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-500/50 text-cyan-950 font-bold py-4 px-4 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] flex items-center justify-center mt-4"
                                            >
                                                {loading ? "Verifying..." : "View My User ID"}
                                            </button>
                                        </motion.form>
                                    )}

                                    {/* --- STATE 4C: USER ID RECOVERED --- */}
                                    {view === "userid_recovered" && (
                                        <motion.div
                                            key="userid-recovered"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ duration: 0.3 }}
                                            className="flex flex-col items-center justify-center text-center px-4 py-4 w-full"
                                        >
                                            <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center mb-6 mt-4">
                                                <User className="w-8 h-8 text-cyan-400" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-white mb-2">Welcome Back!</h3>
                                            <p className="text-zinc-400 mb-6 font-medium">
                                                Your User ID is: <br />
                                                <span className="text-xl text-cyan-400 font-bold bg-cyan-500/10 px-4 py-2 rounded-lg mt-2 inline-block shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">{recoveredUserId}</span>
                                            </p>

                                            <button
                                                onClick={() => { setUserId(recoveredUserId); handleSwitchView("login"); }}
                                                className="w-full bg-cyan-500 hover:bg-cyan-400 text-cyan-950 font-bold py-3 px-4 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] flex items-center justify-center"
                                            >
                                                Return to Log In
                                            </button>
                                        </motion.div>
                                    )}

                                    {/* --- STATE 5: PRIVACY POLICY --- */}
                                    {view === "privacy" && (
                                        <motion.div
                                            key="privacy"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ duration: 0.3 }}
                                            className="text-left text-zinc-300 text-sm max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar"
                                         tabIndex={0}>
                                            <p className="mb-4 text-xs text-zinc-400">Last updated: April 2026</p>
                                            <h4 className="font-bold text-white mb-2 mt-4">1. Information We Collect</h4>
                                            <p className="mb-2">We collect information to provide better services to all our users. To fully utilize FinanceNeo's automated tracking, we collect:</p>
                                            <ul className="list-disc pl-5 mb-4 marker:text-emerald-500">
                                                <li>Personal identifiers (Name, Email).</li>
                                                <li>Financial transaction categorical routing information.</li>
                                                <li>PDF statement uploads required to extract data locally.</li>
                                            </ul>
                                            <h4 className="font-bold text-white mb-2 mt-4">2. How We Use Your Information</h4>
                                            <p className="mb-4">The integrity of your data is paramount. We utilize AI processing via Google Gemini to securely parse and categorize PDF statement uploads. Your data is used exclusively to train these isolated, individual AI models dedicated to your personalized financial goals.</p>
                                            <h4 className="font-bold text-white mb-2 mt-4">3. Data Security</h4>
                                            <p className="mb-4">We deploy military-grade encryption algorithms to ensure your raw identifiers and financial history are securely isolated. <strong>We do not, and never will, sell your financial data.</strong></p>
                                        </motion.div>
                                    )}

                                    {/* --- STATE 6: TERMS AND CONDITIONS --- */}
                                    {view === "terms" && (
                                        <motion.div
                                            key="terms"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ duration: 0.3 }}
                                            className="text-left text-zinc-300 text-sm max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar"
                                         tabIndex={0}>
                                            <p className="mb-4 text-xs text-zinc-400">Last updated: April 2026</p>
                                            <h4 className="font-bold text-white mb-2 mt-4">1. Acceptance of Terms</h4>
                                            <p className="mb-4">By accessing and using FinanceNeo, you accept and agree to be bound by the terms and provision of this agreement.</p>
                                            <h4 className="font-bold text-white mb-2 mt-4">2. Description of Service</h4>
                                            <p className="mb-4">FinanceNeo provides AI-powered financial categorization, tracking, and dashboard generation reliant on local and cloud AI models.</p>
                                            <h4 className="font-bold text-white mb-2 mt-4">3. User Responsibilities</h4>
                                            <ul className="list-disc pl-5 mb-4 marker:text-teal-500">
                                                <li>Provide accurate and lawful information.</li>
                                                <li>Maintain confidentiality of login credentials.</li>
                                                <li>Do not upload malicious files or embedded malware.</li>
                                            </ul>
                                            <h4 className="font-bold text-white mb-2 mt-4">4. Limitation of Liability</h4>
                                            <p className="mb-4">To the maximum extent permitted by law, FinanceNeo shall not be liable for any indirect or consequential damages, or any loss of profits.</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </div>
                </AnimatePresence>,
                document.body
            )}

            {/* Calculator modal via portal so fixed positioning is not affected by motion.div transforms */}
            {mounted && isCalculatorOpen && createPortal(
                <CalculatorModal isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} />,
                document.body
            )}


        </div>
    );
}
