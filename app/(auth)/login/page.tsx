"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState, FormEvent, useRef, useEffect } from "react";
import { Shield, Wallet, Activity, Target, ArrowRight, X, Eye, EyeOff, ChevronLeft, User, LayoutDashboard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    signInUser,
    signUpUser,
    sendPasswordResetOTP,
    verifyResetOTPAndSetPassword,
    recoverUserId
} from "@/app/actions/auth";
import { toast } from "sonner";

type AuthState = "login" | "signup" | "forgot_password_email" | "forgot_password_otp" | "forgot_userid_email" | "forgot_userid_otp" | "userid_recovered";

export default function LandingAndLoginPage() {
    const router = useRouter();
    const supabase = createClient();

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
        router.push("/");
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
        router.push("/");
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
        <div className="relative min-h-screen text-white overflow-hidden selection:bg-emerald-500/30 font-sans">
            {/* Landing Page Content */}
            <motion.div
                className="relative z-10 w-full min-h-screen flex flex-col pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto will-change-transform"
                initial={false}
                animate={{
                    x: showLogin ? "-100vw" : "0vw",
                    opacity: showLogin ? 0 : 1,
                    pointerEvents: showLogin ? "none" : "auto",
                }}
                transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            >
                {/* Navbar Area */}
                <div className="absolute top-8 left-4 sm:left-8 flex items-center gap-3 cursor-pointer">
                    <div className="relative flex items-center justify-center h-10 w-10 shrink-0 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                        <Wallet className="h-5 w-5 text-emerald-400" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white">
                        Finance<span className="text-emerald-400">Neo</span>
                    </span>
                </div>

                <div className="text-center max-w-4xl mx-auto space-y-8 mt-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.05] shadow-inner backdrop-blur-sm">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                        <span className="text-xs font-semibold tracking-wider text-emerald-400 uppercase">Early Access Available</span>
                    </div>

                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 drop-shadow-lg leading-tight pb-2">
                        Intelligent Finances <br /> Built for the Future
                    </h1>

                    <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                        Master your financial life with AI-driven insights, real-time analytics, and bulletproof security. Welcome to the new standard of wealth management.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
                        <button
                            onClick={async () => {
                                const { data: { user } } = await supabase.auth.getUser();
                                if (user) {
                                    router.push("/");
                                } else {
                                    setShowLogin(true);
                                }
                            }}
                            className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-lg hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 group"
                        >
                            Get Started Free
                            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Feature Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24">
                    <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-md hover:bg-white/[0.04] transition-colors group">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                            <Shield className="h-6 w-6 text-emerald-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Military-Grade Security</h3>
                        <p className="text-zinc-400 leading-relaxed text-sm">
                            Your data never leaves our encrypted vault. We employ the strictest protocols to ensure your financial footprint remains yours alone.
                        </p>
                    </div>

                    <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-md hover:bg-white/[0.04] transition-colors group">
                        <div className="h-12 w-12 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(20,184,166,0.1)]">
                            <Activity className="h-6 w-6 text-teal-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Live AI Analytics</h3>
                        <p className="text-zinc-400 leading-relaxed text-sm">
                            Stop looking in the rearview mirror. Our predictive AI models analyze your spending habits before they become problems.
                        </p>
                    </div>

                    <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-md hover:bg-white/[0.04] transition-colors group">
                        <div className="h-12 w-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(234,179,8,0.1)]">
                            <Target className="h-6 w-6 text-yellow-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Goal Precision</h3>
                        <p className="text-zinc-400 leading-relaxed text-sm">
                            Set your sights on the future. Map out your financial milestones and watch as FinanceNeo dynamically guides you there.
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Interactive Login Overlay */}
            <AnimatePresence>
                {showLogin && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center px-4 pointer-events-none">
                        <motion.div
                            className="relative z-10 w-full max-w-md bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_0_80px_rgba(0,0,0,0.8)] rounded-3xl p-8 sm:p-10 will-change-transform pointer-events-auto overflow-hidden"
                            initial={{ opacity: 0, x: "100vw" }}
                            animate={{ opacity: 1, x: "0vw" }}
                            exit={{ opacity: 0, x: "100vw" }}
                            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                        >
                            {view !== "login" && (
                                <button
                                    onClick={() => handleSwitchView("login")}
                                    className="absolute top-4 left-4 p-2 rounded-full text-zinc-500 hover:text-white hover:bg-white/5 transition-colors focus:outline-none z-20 flex items-center pr-3"
                                >
                                    <ChevronLeft className="h-5 w-5 mr-1" />
                                    <span className="text-sm font-medium">Back</span>
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setShowLogin(false);
                                    handleSwitchView("login");
                                }}
                                className="absolute top-4 right-4 p-2 rounded-full text-zinc-500 hover:text-white hover:bg-white/5 transition-colors focus:outline-none z-20"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            <div className="mb-8 mt-2 text-center relative z-10">
                                <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
                                    {(view === "login" || view === "signup") && "Welcome to"}
                                    {view === "forgot_password_email" && "Recover Account"}
                                    {view === "forgot_password_otp" && "Secure Account"}
                                    <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 text-3xl">FinanceNeo</span>
                                </h2>
                                <p className="text-zinc-400 text-sm h-5 transition-all">
                                    {view === "login" && "Enter your username to log in."}
                                    {view === "signup" && "Create your new account profile."}
                                    {view === "forgot_password_email" && "Enter your email to receive an OTP."}
                                    {view === "forgot_password_otp" && "Reset your password with the code sent."}
                                    {view === "forgot_userid_email" && "Enter your email to recover your User ID."}
                                    {view === "forgot_userid_otp" && "Verify your identity with the code sent."}
                                    {view === "userid_recovered" && "Your identity has been verified."}
                                </p>
                            </div>

                            <motion.div
                                className="relative w-full"
                                animate={{ height: view === "signup" ? 390 : view === "forgot_password_otp" ? 350 : view === "login" ? 340 : view === "userid_recovered" ? 280 : 220 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                            >
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
                                            className="flex flex-col gap-4 absolute inset-0"
                                        >
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center pr-1">
                                                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1">User ID</label>
                                                    <button type="button" onClick={() => handleSwitchView("forgot_userid_email")} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">Forgot User ID?</button>
                                                </div>
                                                <input
                                                    type="text" required value={userId} onChange={(e) => setUserId(e.target.value)} disabled={loading}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium backdrop-blur-sm"
                                                    placeholder="e.g. SatoshiNeo"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center pr-1">
                                                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1">Password</label>
                                                    <button type="button" onClick={() => handleSwitchView("forgot_password_email")} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">Forgot Password?</button>
                                                </div>
                                                <div className="relative">
                                                    <input
                                                        type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading}
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pr-10 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium backdrop-blur-sm"
                                                        placeholder="••••••••"
                                                    />
                                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors focus:outline-none">
                                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 mt-1">
                                                <input
                                                    type="checkbox"
                                                    id="rememberMe"
                                                    checked={rememberMe}
                                                    onChange={(e) => setRememberMe(e.target.checked)}
                                                    className="w-4 h-4 rounded border-white/10 bg-black/40 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 transition-colors"
                                                />
                                                <label htmlFor="rememberMe" className="text-sm text-zinc-400 select-none cursor-pointer hover:text-white transition-colors">
                                                    Remember me
                                                </label>
                                            </div>

                                            <button
                                                type="submit" disabled={loading || !userId || !password}
                                                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-emerald-950 font-bold py-4 px-4 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center justify-center mt-2"
                                            >
                                                {loading ? "Authenticating..." : "Log In"}
                                            </button>

                                            <div className="text-center mt-4">
                                                <span className="text-sm text-zinc-500">Don't have an account? </span>
                                                <button type="button" onClick={() => handleSwitchView("signup")} className="text-sm text-emerald-400 font-semibold hover:text-emerald-300 transition-colors">Sign Up</button>
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
                                            className="flex flex-col gap-4 absolute inset-0"
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
                                                <span className="text-sm text-zinc-500">Already a member? </span>
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
                                            className="flex flex-col gap-4 absolute inset-0"
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
                                                <button type="button" onClick={() => handleSwitchView("login")} className="text-sm text-zinc-500 font-semibold hover:text-white transition-colors">&larr; Back to Login</button>
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
                                            className="flex flex-col gap-4 absolute inset-0"
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
                                            className="flex flex-col gap-4 absolute inset-0"
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
                                                <button type="button" onClick={() => handleSwitchView("login")} className="text-sm text-zinc-500 font-semibold hover:text-white transition-colors">&larr; Back to Login</button>
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
                                            className="flex flex-col gap-6 absolute inset-0"
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
                                                <p className="text-xs text-zinc-500 mt-3 self-start pl-1">
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
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.3 }}
                                            className="flex flex-col items-center justify-center absolute inset-0 text-center px-4"
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
                                </AnimatePresence>
                            </motion.div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
