"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
    Settings,
    LogOut,
    Trash2,
    ChevronDown,
    Shield,
    X,
    Eye,
    EyeOff,
    AlertTriangle,
    Check,
    User,
    KeyRound,
    Smartphone,
    Mail,
    Calendar,
    Clock,
    Globe,
    Share,
    CheckCircle2,
} from "lucide-react";
import { useAddToHomeScreen } from "@/hooks/useAddToHomeScreen";

// ─── Types ────────────────────────────────────────────────────────────────────
type ModalType = "profile" | "security" | "danger" | "signout" | "install" | null;

// ─── Shared Modal Wrapper with Framer Motion ──────────────────────────────────
function AnimatedModalBackdrop({ onClose, children, blur }: { onClose: () => void; children: React.ReactNode; blur?: boolean }) {
    return createPortal(
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
                position: "fixed", inset: 0, zIndex: 99999,
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: 16,
                background: blur ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.5)",
                backdropFilter: blur ? "blur(16px)" : "blur(6px)",
            }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: "relative", width: "95%", maxWidth: 420, maxHeight: "90dvh",
                    borderRadius: 24, background: "#0e1118",
                    border: "1px solid rgba(255,255,255,0.08)",
                    boxShadow: "0 48px 96px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04) inset",
                    display: "flex", flexDirection: "column", overflow: "hidden",
                }}
            >
                {children}
            </motion.div>
        </motion.div>,
        document.body
    );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
    return (
        <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#fff", letterSpacing: "-0.01em" }}>{title}</h3>
            <button
                onClick={onClose}
                style={{
                    padding: 6, color: "#52525b", background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, cursor: "pointer",
                    display: "flex", alignItems: "center", transition: "all 0.15s",
                }}
            >
                <X size={14} />
            </button>
        </div>
    );
}

// ─── Reusable Input Components ────────────────────────────────────────────────
function PasswordInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    const [show, setShow] = useState(false);
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, color: "#52525b" }}>{label}</label>
            <div style={{ position: "relative" }}>
                <input
                    type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)}
                    placeholder="••••••••"
                    style={{
                        width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 12, padding: "10px 40px 10px 14px", fontSize: 13, color: "#fff", outline: "none", fontWeight: 300,
                    }}
                />
                <button type="button" onClick={() => setShow((v) => !v)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#52525b", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}
                >
                    {show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
            </div>
        </div>
    );
}

function TextInput({ label, value, onChange, placeholder, disabled }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, color: "#52525b" }}>{label}</label>
            <input
                type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
                style={{
                    width: "100%", background: disabled ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px 14px",
                    fontSize: 13, color: disabled ? "#52525b" : "#fff", outline: "none", fontWeight: 300,
                }}
            />
        </div>
    );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 32, height: 32, borderRadius: 10,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                color: "#52525b", flexShrink: 0,
            }}>
                {icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, color: "#3f3f46", margin: 0 }}>{label}</p>
                <p style={{ fontSize: 13, color: "#e4e4e7", margin: "2px 0 0", fontWeight: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</p>
            </div>
        </div>
    );
}

// ─── Profile Modal ────────────────────────────────────────────────────────────
function ProfileModal({ onClose, userName, userEmail }: { onClose: () => void; userName: string; userEmail: string }) {
    const [username, setUsername] = useState("");
    const [birthdate, setBirthdate] = useState("");

    const handleSave = () => {
        toast.custom(() => (
            <div style={{ display: "flex", gap: 10, alignItems: "center", background: "#0e1118", border: "1px solid rgba(16,185,129,0.25)", padding: "14px 18px", borderRadius: 12, color: "#10b981", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                <Check size={18} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>Profile updated successfully</span>
            </div>
        ), { duration: 3000, position: "bottom-right" });
    };

    const initials = userName ? userName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() : "FN";

    return (
        <AnimatedModalBackdrop onClose={onClose}>
            <ModalHeader title="Profile" onClose={onClose} />
            <div style={{ padding: "16px 20px 40px", overflowY: "auto", flex: 1 }} className="custom-scrollbar">
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                    {/* Avatar + Name Banner (compact) */}
                    <div style={{
                        display: "flex", alignItems: "center", gap: 14, padding: "12px 14px",
                        borderRadius: 14, background: "linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(6,182,212,0.04) 100%)",
                        border: "1px solid rgba(16,185,129,0.1)",
                    }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 14,
                            background: "linear-gradient(135deg, #10b981, #059669)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 16, fontWeight: 700, color: "#022c22", flexShrink: 0,
                            boxShadow: "0 4px 12px rgba(16,185,129,0.25)",
                        }}>
                            {initials}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</p>
                            <p style={{ fontSize: 11, color: "#a1a1aa", margin: "3px 0 0", fontWeight: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 8px", marginTop: 4 }}>
                                <span style={{ fontSize: 10, color: "#71717a", margin: 0, fontWeight: 500 }}>
                                    Member since {new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                                </span>
                                {birthdate && (
                                    <div style={{ fontSize: 10, color: "#34d399", margin: 0, fontWeight: 500, display: "flex", alignItems: "center", gap: 3 }}>
                                        <span style={{ width: 3, height: 3, borderRadius: "50%", background: "currentColor" }} />
                                        Born {new Date(birthdate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Edit Section */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, color: "#71717a", margin: 0 }}>Edit Profile</p>
                        <TextInput label="Username" value={username} onChange={setUsername} placeholder="e.g. SatoshiNeo" />
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <label style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, color: "#71717a" }}>Birthdate</label>
                            <input
                                type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)}
                                style={{
                                    width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                                    borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#fff", outline: "none", fontWeight: 300,
                                    colorScheme: "dark",
                                }}
                            />
                        </div>
                        <button onClick={handleSave} className="active:scale-[0.98] transition-all duration-200" style={{
                            padding: "11px 20px", borderRadius: 12, fontSize: 12, fontWeight: 600,
                            border: "none", background: "linear-gradient(135deg,#10b981,#059669)",
                            color: "#022c22", cursor: "pointer", marginTop: 6,
                        }}>Save Changes</button>
                    </div>
                </div>
            </div>
        </AnimatedModalBackdrop>
    );
}

// ─── Security Modal ───────────────────────────────────────────────────────────
function SecurityModal({ onClose }: { onClose: () => void }) {
    const [currentPw, setCurrentPw] = useState("");
    const [newPw, setNewPw] = useState("");

    const handleSave = () => {
        toast.custom(() => (
            <div style={{ display: "flex", gap: 10, alignItems: "center", background: "#0e1118", border: "1px solid rgba(16,185,129,0.25)", padding: "14px 18px", borderRadius: 12, color: "#10b981", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                <Check size={18} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>Password updated</span>
            </div>
        ), { duration: 3000, position: "bottom-right" });
    };

    return (
        <AnimatedModalBackdrop onClose={onClose}>
            <ModalHeader title="Security" onClose={onClose} />
            <div style={{ padding: "20px 24px 28px", overflowY: "auto", flex: 1 }} className="custom-scrollbar">
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{
                        display: "flex", gap: 12, padding: 14, borderRadius: 14,
                        background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.12)",
                    }}>
                        <Shield size={15} style={{ color: "#60a5fa", flexShrink: 0, marginTop: 1 }} />
                        <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>Keep your account secure with a strong, unique password.</p>
                    </div>
                    <PasswordInput label="Current Password" value={currentPw} onChange={setCurrentPw} />
                    <PasswordInput label="New Password" value={newPw} onChange={setNewPw} />
                    <button onClick={handleSave} className="active:scale-[0.98] transition-all duration-200" style={{
                        padding: "10px 20px", borderRadius: 12, fontSize: 12, fontWeight: 600,
                        border: "none", background: "linear-gradient(135deg,#10b981,#059669)",
                        color: "#022c22", cursor: "pointer",
                    }}>Update Password</button>
                </div>
            </div>
        </AnimatedModalBackdrop>
    );
}

// ─── Danger Zone Modal ────────────────────────────────────────────────────────
function DangerModal({ onClose }: { onClose: () => void }) {
    const [deletePw, setDeletePw] = useState("");
    const [deleteText, setDeleteText] = useState("");
    const [deleteConfirmed, setDeleteConfirmed] = useState(false);
    const canDelete = deletePw && deleteConfirmed && deleteText === "DELETE";

    return (
        <AnimatedModalBackdrop onClose={onClose}>
            <ModalHeader title="Danger Zone" onClose={onClose} />
            <div style={{ padding: "20px 24px 28px", overflowY: "auto", flex: 1 }} className="custom-scrollbar">
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{
                        display: "flex", gap: 12, padding: 14, borderRadius: 14,
                        background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.14)",
                    }}>
                        <AlertTriangle size={15} style={{ color: "#f87171", flexShrink: 0, marginTop: 1 }} />
                        <p style={{ fontSize: 12, color: "#a1a1aa", lineHeight: 1.6, margin: 0 }}>
                            Permanently deletes your account and data. <span style={{ color: "#f87171", fontWeight: 500 }}>This cannot be undone.</span>
                        </p>
                    </div>
                    <PasswordInput label="Confirm Password" value={deletePw} onChange={setDeletePw} />
                    <TextInput label='Type "DELETE" to confirm' value={deleteText} onChange={setDeleteText} placeholder="DELETE" />
                    <label style={{ display: "flex", gap: 10, cursor: "pointer", alignItems: "flex-start" }}>
                        <input type="checkbox" checked={deleteConfirmed} onChange={e => setDeleteConfirmed(e.target.checked)} style={{ marginTop: 2 }} />
                        <span style={{ fontSize: 12, color: "#71717a" }}>I understand this is permanent</span>
                    </label>
                    <button disabled={!canDelete} className="active:scale-[0.98] transition-all duration-200" style={{
                        padding: "10px 20px", borderRadius: 12, fontSize: 12, fontWeight: 600,
                        border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.08)",
                        color: "#f87171", cursor: "pointer", opacity: canDelete ? 1 : 0.35,
                    }}>Delete Account</button>
                </div>
            </div>
        </AnimatedModalBackdrop>
    );
}

// ─── Sign Out Modal ───────────────────────────────────────────────────────────
function SignOutModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
    return (
        <AnimatedModalBackdrop onClose={onClose} blur>
            <div style={{ padding: 28, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                <div style={{
                    height: 52, width: 52, borderRadius: "50%",
                    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center", color: "#f87171",
                }}>
                    <LogOut size={22} />
                </div>
                <div>
                    <h2 style={{ fontSize: 16, fontWeight: 600, color: "#fff", margin: "0 0 6px" }}>Sign Out</h2>
                    <p style={{ fontSize: 13, color: "#71717a", margin: 0, fontWeight: 300 }}>Are you sure you want to sign out?</p>
                </div>
            </div>
            <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <button onClick={onClose} className="hover:bg-white/5 active:scale-95 transition-all duration-200" style={{ flex: 1, padding: 14, background: "transparent", border: "none", color: "#a1a1aa", cursor: "pointer", fontSize: 13 }}>Cancel</button>
                <div style={{ width: 1, background: "rgba(255,255,255,0.06)" }} />
                <button onClick={onConfirm} className="hover:bg-red-500/10 active:scale-95 transition-all duration-200" style={{ flex: 1, padding: 14, background: "transparent", border: "none", color: "#f87171", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Sign Out</button>
            </div>
        </AnimatedModalBackdrop>
    );
}


// ─── Dropdown Portal ──────────────────────────────────────────────────────────
function DropdownPortal({ open, rect, children }: { open: boolean; rect: DOMRect | null; children: React.ReactNode }) {
    if (!open || !rect || typeof document === "undefined") return null;
    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
    const minWidth = 140;
    const maxWidth = isMobile ? Math.min(180, window.innerWidth - 32) : 160;

    const top = rect.bottom + 8;
    // Anchor to button's right edge with a small offset
    const left = Math.max(8, Math.min(rect.right - maxWidth + 8, window.innerWidth - maxWidth - 8));

    return createPortal(
        <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -5 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{
                position: "absolute",
                top, left,
                width: maxWidth,
                minWidth,
                zIndex: 99998,
                background: "#0e1118", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14, boxShadow: "0 24px 60px rgba(0,0,0,0.8)",
                overflow: "hidden",
                transformOrigin: "top right",
            }}
        >
            <div id="fn-user-dropdown" style={{ padding: 3 }}>{children}</div>
        </motion.div>,
        document.body
    );
}

// ─── Menu Item ────────────────────────────────────────────────────────────────
function MenuItem({ icon, label, danger, onClick }: { icon: React.ReactNode; label: string; danger?: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="hover:bg-white/5 active:scale-[0.97] transition-all duration-150"
            style={{
                width: "100%", display: "flex", alignItems: "center", gap: 6,
                padding: "5px 6px", borderRadius: 8, cursor: "pointer",
                background: "transparent", border: "none",
                color: danger ? "#f87171" : "#e4e4e7", textAlign: "left",
                whiteSpace: "nowrap",
            }}
        >
            {icon}
            <span style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>
        </button>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function UserDropdown({
    userName = "Abhijeet Gautam",
    userHandle = "AbhijNeo",
    userEmail = "abhijeet@financneo.com",
    onSignOut,
}: {
    userName?: string;
    userHandle?: string;
    userEmail?: string;
    onSignOut?: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [modal, setModal] = useState<ModalType>(null);
    const [btnRect, setBtnRect] = useState<DOMRect | null>(null);
    const [showIOSGuide, setShowIOSGuide] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);

    const { canInstall, isInstalled, isIOS, triggerInstall } = useAddToHomeScreen();

    const updateRect = useCallback(() => { if (btnRef.current) setBtnRect(btnRef.current.getBoundingClientRect()); }, []);
    const toggleOpen = () => { updateRect(); setOpen(v => !v); };

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (btnRef.current && !btnRef.current.contains(e.target as Node)) {
                if (!document.getElementById("fn-user-dropdown")?.contains(e.target as Node)) setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        window.addEventListener("resize", updateRect);
        return () => { document.removeEventListener("mousedown", handler); window.removeEventListener("resize", updateRect); };
    }, [updateRect]);

    const openModal = (type: ModalType) => { setOpen(false); setModal(type); };

    const handleInstallClick = () => {
        if (isInstalled) return;
        if (isIOS) setShowIOSGuide(v => !v);
        else triggerInstall();
    };

    return (
        <>
            <button ref={btnRef} onClick={toggleOpen} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 8px",
                borderRadius: 12, fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: open ? "rgba(255,255,255,0.1)" : "transparent",
                color: open ? "#fff" : "#a1a1aa", border: "none",
            }}>
                <Settings size={14} style={{ color: open ? "#34d399" : "inherit", transform: open ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 0.3s ease" }} />
                <span className="hidden sm:inline">Settings</span>
                <ChevronDown size={11} className="hidden sm:inline" />
            </button>

            {open && <div onClick={() => setOpen(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "transparent", zIndex: 99997 }} />}

            <AnimatePresence>
                {open && (
                    <DropdownPortal open={open} rect={btnRect}>
                        <MenuItem icon={<User size={13} />} label="Profile Settings" onClick={() => openModal("profile")} />
                        <MenuItem icon={<KeyRound size={13} />} label="Change Password" onClick={() => openModal("security")} />

                        {/* Direct Add to Home Screen Row */}
                        <div style={{ position: "relative" }}>
                            <MenuItem
                                icon={isInstalled ? <CheckCircle2 size={13} style={{ color: "#34d399" }} /> : <Smartphone size={13} />}
                                label={isInstalled ? "App Installed" : "Add to Home Screen"}
                                onClick={handleInstallClick}
                            />
                            {!isInstalled && (canInstall || isIOS) && (
                                <span style={{
                                    position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                                    fontSize: 8, fontWeight: 800, padding: "1px 4px", borderRadius: 4,
                                    background: "rgba(52,211,153,0.15)", color: "#34d399", pointerEvents: "none"
                                }}>{isIOS ? "iOS" : "GET"}</span>
                            )}
                        </div>

                        {showIOSGuide && isIOS && !isInstalled && (
                            <div style={{
                                margin: "2px 4px 6px", padding: "6px 8px", borderRadius: 10,
                                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                                display: "flex", flexDirection: "column", gap: 5
                            }}>
                                <p style={{ fontSize: 8, fontWeight: 700, color: "#71717a", textTransform: "uppercase", margin: 0, letterSpacing: "0.05em" }}>Safari Steps:</p>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "#a1a1aa" }}>
                                        <Share size={10} /> <span>1. Tap Share</span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "#a1a1aa" }}>
                                        <span style={{ fontSize: 11 }}>⊞</span> <span>2. Add to Home Screen</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ margin: "3px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }} />
                        <MenuItem icon={<AlertTriangle size={13} style={{ color: "#ef4444" }} />} label="Delete Account" danger onClick={() => openModal("danger")} />
                        <MenuItem icon={<LogOut size={13} />} label="Sign Out" onClick={() => openModal("signout")} />
                    </DropdownPortal>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {modal === "profile" && <ProfileModal onClose={() => setModal(null)} userName={userName} userEmail={userEmail} />}
                {modal === "security" && <SecurityModal onClose={() => setModal(null)} />}
                {modal === "danger" && <DangerModal onClose={() => setModal(null)} />}
                {modal === "signout" && <SignOutModal onClose={() => setModal(null)} onConfirm={() => { setModal(null); onSignOut?.(); }} />}
            </AnimatePresence>
        </>
    );
}
