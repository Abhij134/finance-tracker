"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
    Settings,
    LogOut,
    Trash2,
    ChevronDown,
    ChevronUp,
    Shield,
    X,
    Eye,
    EyeOff,
    AlertTriangle,
    Check,
    User,
    KeyRound,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type ModalType = "profile" | "security" | "danger" | "signout" | null;

// ─── Input Components ─────────────────────────────────────────────────────────
function PasswordInput({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
}) {
    const [show, setShow] = useState(false);
    return (
        <div className="flex flex-col gap-1.5">
            <label
                style={{
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    fontWeight: 600,
                    color: "#71717a",
                }}
            >
                {label}
            </label>
            <div style={{ position: "relative" }}>
                <input
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="••••••••"
                    style={{
                        width: "100%",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 12,
                        padding: "10px 40px 10px 14px",
                        fontSize: 14,
                        color: "#fff",
                        outline: "none",
                        fontWeight: 300,
                        transition: "border 0.15s, box-shadow 0.15s",
                    }}
                    onFocus={(e) => {
                        e.currentTarget.style.border = "1px solid rgba(16,185,129,0.5)";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(16,185,129,0.08)";
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)";
                        e.currentTarget.style.boxShadow = "none";
                    }}
                />
                <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    style={{
                        position: "absolute",
                        right: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#52525b",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        padding: 0,
                        transition: "color 0.15s",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#d4d4d8")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#52525b")}
                >
                    {show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
            </div>
        </div>
    );
}

function TextInput({
    label,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label
                style={{
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    fontWeight: 600,
                    color: "#71717a",
                }}
            >
                {label}
            </label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    padding: "10px 14px",
                    fontSize: 14,
                    color: "#fff",
                    outline: "none",
                    fontWeight: 300,
                    transition: "border 0.15s, box-shadow 0.15s",
                }}
                onFocus={(e) => {
                    e.currentTarget.style.border = "1px solid rgba(16,185,129,0.5)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(16,185,129,0.08)";
                }}
                onBlur={(e) => {
                    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)";
                    e.currentTarget.style.boxShadow = "none";
                }}
            />
        </div>
    );
}

// ─── Account Settings Modal ───────────────────────────────────────────────────
function AccountSettingsModal({
    onClose,
    userName,
    userHandle,
    view
}: {
    onClose: () => void;
    userName: string;
    userHandle: string;
    view: "profile" | "security" | "danger";
}) {
    const [username, setUsername] = useState("");
    const [currentPw, setCurrentPw] = useState("");
    const [newPw, setNewPw] = useState("");
    const [deletePw, setDeletePw] = useState("");
    const [deleteText, setDeleteText] = useState("");
    const [deleteConfirmed, setDeleteConfirmed] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const initials = userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    const handleSave = (key: string) => {
        // ← Wire your real API call here
        toast.custom(() => (
            <div style={{ display: "flex", gap: 10, alignItems: "center", background: "#0e1118", border: "1px solid rgba(16, 185, 129, 0.25)", padding: "14px 18px", borderRadius: 12, color: "#10b981", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                <Check size={18} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>Saved successfully</span>
            </div>
        ), { duration: 3000, position: "bottom-right" });
    };

    const handleDelete = () => {
        if (!deletePw || !deleteConfirmed || deleteText !== "DELETE") return;
        setDeleting(true);
        // ← Wire your real delete API call here
        setTimeout(() => setDeleting(false), 2000);
    };

    return (
        <div style={{ paddingTop: 0 }}>

            {/* ── Profile ── */}
            {view === "profile" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ padding: 16, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, color: "#71717a", margin: "0 0 10px" }}>Session Info</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: 12, color: "#71717a", fontWeight: 500 }}>Last Login</span>
                                <span style={{ fontSize: 12, color: "#e4e4e7" }}>Just now</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: 12, color: "#71717a", fontWeight: 500 }}>Browser</span>
                                <span style={{ fontSize: 12, color: "#e4e4e7" }}>{typeof navigator !== 'undefined' ? (navigator.userAgent.includes("Chrome") ? "Chrome" : navigator.userAgent.includes("Safari") ? "Safari" : navigator.userAgent.includes("Firefox") ? "Firefox" : "Browser") : "Unknown"}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: 12, color: "#71717a", fontWeight: 500 }}>Device</span>
                                <span style={{ fontSize: 12, color: "#e4e4e7" }}>{typeof navigator !== 'undefined' ? (navigator.userAgent.includes("Mac") ? "Mac OS" : navigator.userAgent.includes("Win") ? "Windows" : navigator.userAgent.includes("Linux") ? "Linux" : "Device") : "Unknown"}</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />

                    <TextInput
                        label="New Username"
                        value={username}
                        onChange={setUsername}
                        placeholder="e.g. SatoshiNeo"
                    />
                    <button
                        onClick={() => handleSave("profile")}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 7,
                            padding: "10px 20px",
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 600,
                            letterSpacing: "0.02em",
                            cursor: "pointer",
                            border: "none",
                            background: "linear-gradient(135deg,#10b981,#059669)",
                            color: "#022c22",
                            boxShadow: "0 4px 16px rgba(16,185,129,0.22)",
                            transition: "all 0.15s",
                        }}
                    >
                        <User size={13} />
                        Update Username
                    </button>
                </div>
            )}

            {/* ── Security ── */}
            {view === "security" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <PasswordInput
                        label="Current Password"
                        value={currentPw}
                        onChange={setCurrentPw}
                    />
                    <PasswordInput label="New Password" value={newPw} onChange={setNewPw} />
                    <button
                        onClick={() => handleSave("security")}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 7,
                            padding: "10px 20px",
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 600,
                            letterSpacing: "0.02em",
                            cursor: "pointer",
                            border: "none",
                            background: "linear-gradient(135deg,#10b981,#059669)",
                            color: "#022c22",
                            boxShadow: "0 4px 16px rgba(16,185,129,0.22)",
                            transition: "all 0.15s",
                        }}
                    >
                        <Shield size={13} />
                        Update Password
                    </button>
                </div>
            )}

            {/* ── Danger Zone ── */}
            {view === "danger" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div
                        style={{
                            display: "flex",
                            gap: 12,
                            padding: 16,
                            borderRadius: 12,
                            background: "rgba(239,68,68,0.06)",
                            border: "1px solid rgba(239,68,68,0.14)",
                        }}
                    >
                        <AlertTriangle
                            size={15}
                            style={{ color: "#f87171", flexShrink: 0, marginTop: 1 }}
                        />
                        <p
                            style={{
                                fontSize: 12,
                                color: "#a1a1aa",
                                lineHeight: 1.6,
                                margin: 0,
                                fontWeight: 300,
                            }}
                        >
                            Permanently deletes your FinanceNeo account, all financial data,
                            transaction history, and AI insights.{" "}
                            <span style={{ color: "#f87171", fontWeight: 500 }}>
                                This cannot be undone.
                            </span>
                        </p>
                    </div>

                    <PasswordInput
                        label="Confirm your password to continue"
                        value={deletePw}
                        onChange={setDeletePw}
                    />

                    <TextInput
                        label='Type "DELETE" to confirm'
                        value={deleteText}
                        onChange={setDeleteText}
                        placeholder="DELETE"
                    />

                    <label
                        style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                            cursor: "pointer",
                        }}
                    >
                        <div
                            onClick={() => setDeleteConfirmed((v) => !v)}
                            style={{
                                marginTop: 1,
                                height: 16,
                                width: 16,
                                borderRadius: 5,
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.15s",
                                background: deleteConfirmed
                                    ? "#ef4444"
                                    : "rgba(255,255,255,0.05)",
                                border: deleteConfirmed
                                    ? "1px solid #ef4444"
                                    : "1px solid rgba(255,255,255,0.12)",
                            }}
                        >
                            {deleteConfirmed && <Check size={10} color="#fff" />}
                        </div>
                        <span
                            style={{
                                fontSize: 12,
                                color: "#71717a",
                                lineHeight: 1.5,
                                fontWeight: 300,
                            }}
                        >
                            I understand this is permanent and cannot be undone
                        </span>
                    </label>

                    <button
                        onClick={handleDelete}
                        disabled={!deletePw || !deleteConfirmed || deleteText !== "DELETE" || deleting}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 7,
                            padding: "10px 20px",
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 600,
                            letterSpacing: "0.02em",
                            cursor:
                                !deletePw || !deleteConfirmed || deleteText !== "DELETE" || deleting
                                    ? "not-allowed"
                                    : "pointer",
                            opacity: !deletePw || !deleteConfirmed || deleteText !== "DELETE" || deleting ? 0.35 : 1,
                            border: "1px solid rgba(239,68,68,0.25)",
                            background: "rgba(239,68,68,0.08)",
                            color: "#f87171",
                            width: "100%",
                            transition: "all 0.15s",
                        }}
                    >
                        {deleting ? (
                            <div
                                style={{
                                    height: 13,
                                    width: 13,
                                    borderRadius: "50%",
                                    border: "2px solid rgba(248,113,113,0.2)",
                                    borderTopColor: "#f87171",
                                    animation: "spin 0.7s linear infinite",
                                }}
                            />
                        ) : (
                            <Trash2 size={13} />
                        )}
                        {deleting ? "Deleting account…" : "Permanently Delete Account"}
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Header Helper ───────────────────────────────────────────────────────────
function ModalHeader({ title, onClose, isDanger }: { title: string, onClose: () => void, isDanger?: boolean }) {
    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            background: isDanger ? "linear-gradient(135deg,rgba(239,68,68,0.05) 0%,transparent 100%)" : "linear-gradient(135deg,rgba(16,185,129,0.05) 0%,transparent 100%)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#fff", letterSpacing: "-0.02em" }}>{title}</h3>
            <button
                onClick={onClose}
                style={{
                    padding: 6,
                    borderRadius: 8,
                    color: "#52525b",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    transition: "color 0.15s, background 0.15s",
                }}
                onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "#d4d4d8";
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "#52525b";
                    (e.currentTarget as HTMLElement).style.background = "none";
                }}
            >
                <X size={16} />
            </button>
        </div>
    );
}

// ─── Individual Modals ────────────────────────────────────────────────────────
function ProfileModal({ onClose, userName, userHandle }: { onClose: () => void; userName: string; userHandle: string }) {
    return (
        <div
            onClick={(e) => e.stopPropagation()}
            style={{
                width: "100%",
                maxWidth: 400,
                borderRadius: 20,
                overflow: "hidden",
                background: "linear-gradient(160deg,#0e1118 0%,#090c10 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.7), 0 48px 96px rgba(0,0,0,0.8), 0 0 120px rgba(16,185,129,0.05)",
            }}
        >
            <ModalHeader title="Profile Settings" onClose={onClose} />
            <div style={{ padding: "24px" }}>
                <AccountSettingsModal onClose={onClose} userName={userName} userHandle={userHandle} view="profile" />
            </div>
        </div>
    );
}

function SecurityModal({ onClose, userName, userHandle }: { onClose: () => void; userName: string; userHandle: string }) {
    return (
        <div
            onClick={(e) => e.stopPropagation()}
            style={{
                width: "100%",
                maxWidth: 400,
                borderRadius: 20,
                overflow: "hidden",
                background: "linear-gradient(160deg,#0e1118 0%,#090c10 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.7), 0 48px 96px rgba(0,0,0,0.8), 0 0 120px rgba(16,185,129,0.05)",
            }}
        >
            <ModalHeader title="Change Your Password" onClose={onClose} />
            <div style={{ padding: "24px" }}>
                <AccountSettingsModal onClose={onClose} userName={userName} userHandle={userHandle} view="security" />
            </div>
        </div>
    );
}

function DangerModal({ onClose, userName, userHandle }: { onClose: () => void; userName: string; userHandle: string }) {
    return (
        <div
            onClick={(e) => e.stopPropagation()}
            style={{
                width: "100%",
                maxWidth: 400,
                borderRadius: 20,
                overflow: "hidden",
                background: "linear-gradient(160deg,#0e1118 0%,#090c10 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.7), 0 48px 96px rgba(0,0,0,0.8), 0 0 120px rgba(239,68,68,0.05)",
            }}
        >
            <ModalHeader title="Delete Your Account" onClose={onClose} isDanger />
            <div style={{ padding: "24px" }}>
                <AccountSettingsModal onClose={onClose} userName={userName} userHandle={userHandle} view="danger" />
            </div>
        </div>
    );
}

// Remove the whole Modal component block.

// ─── Dropdown Portal ──────────────────────────────────────────────────────────
function DropdownPortal({
    open,
    rect,
    children,
}: {
    open: boolean;
    rect: DOMRect | null;
    children: React.ReactNode;
}) {
    if (!open || !rect || typeof document === "undefined") return null;

    const top = rect.bottom + 8;
    const right = window.innerWidth - rect.right;

    return createPortal(
        <div
            onClick={(e) => {
                if ((e.target as HTMLElement).id === "dropdown-overlay") {
                    // Close portal when clicking outside the absolute container
                    return;
                }
            }}
            style={{
                position: "absolute",
                top,
                right,
                zIndex: 99998,
                animation: "dropIn 0.18s cubic-bezier(0.34,1.4,0.64,1)",
                transformOrigin: "top right",
                background: "linear-gradient(160deg,#0e1118,#090c10)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                boxShadow:
                    "0 0 0 1px rgba(0,0,0,0.7), 0 24px 60px rgba(0,0,0,0.8), 0 0 80px rgba(16,185,129,0.05)",
                overflow: "hidden",
            }}
        >
            {children}
            <style>{`
        @keyframes dropIn {
          from { opacity:0; transform:scale(0.94) translateY(-6px); }
          to   { opacity:1; transform:scale(1)    translateY(0); }
        }
        @keyframes spin   { to{transform:rotate(360deg)} }
      `}</style>
        </div>,
        document.body
    );
}

// ─── Sign Out Modal ───────────────────────────────────────────────────────────
function SignOutModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
    return (
        <div
            onClick={(e) => e.stopPropagation()}
            style={{
                width: "100%",
                maxWidth: 340,
                borderRadius: 20,
                overflow: "hidden",
                background: "linear-gradient(160deg,#0e1118 0%,#090c10 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.7), 0 48px 96px rgba(0,0,0,0.8)",
            }}
        >
            <div
                style={{
                    padding: "24px",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 16,
                }}
            >
                <div
                    style={{
                        height: 48,
                        width: 48,
                        borderRadius: "50%",
                        background: "rgba(239,68,68,0.1)",
                        border: "1px solid rgba(239,68,68,0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#f87171",
                    }}
                >
                    <LogOut size={22} style={{ transform: "translateX(2px)" }} />
                </div>
                <div>
                    <h2 style={{ fontSize: 16, fontWeight: 600, color: "#fff", margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>
                        Sign Out
                    </h2>
                    <p style={{ fontSize: 13, color: "#a1a1aa", margin: 0, lineHeight: 1.5, fontWeight: 300 }}>
                        Are you sure you want to sign out of FinanceNeo? You will need to log back in to access your dashboard.
                    </p>
                </div>
            </div>

            <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}>
                <button
                    onClick={onClose}
                    style={{
                        flex: 1,
                        padding: "14px",
                        background: "transparent",
                        border: "none",
                        borderRight: "1px solid rgba(255,255,255,0.06)",
                        color: "#a1a1aa",
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#d4d4d8";
                        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#a1a1aa";
                        e.currentTarget.style.background = "transparent";
                    }}
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    style={{
                        flex: 1,
                        padding: "14px",
                        background: "transparent",
                        border: "none",
                        color: "#f87171",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(239,68,68,0.08)";
                        e.currentTarget.style.color = "#fca5a5";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#f87171";
                        e.currentTarget.style.background = "transparent";
                    }}
                >
                    Sign Out
                </button>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function UserDropdown({
    userName = "Abhijeet Gautam",
    userHandle = "AbhijNeo",
    onSignOut,
}: {
    userName?: string;
    userHandle?: string;
    onSignOut?: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [modal, setModal] = useState<ModalType>(null);
    const [btnRect, setBtnRect] = useState<DOMRect | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);

    const initials = userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    const updateRect = useCallback(() => {
        if (btnRef.current) setBtnRect(btnRef.current.getBoundingClientRect());
    }, []);

    const toggleOpen = () => {
        updateRect();
        setOpen((v) => !v);
    };

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (btnRef.current && !btnRef.current.contains(e.target as Node)) {
                const dropEl = document.getElementById("fn-user-dropdown");
                if (!dropEl || !dropEl.contains(e.target as Node)) {
                    setOpen(false);
                }
            }
        };
        document.addEventListener("mousedown", handler);
        window.addEventListener("scroll", updateRect, true);
        window.addEventListener("resize", updateRect);
        return () => {
            document.removeEventListener("mousedown", handler);
            window.removeEventListener("scroll", updateRect, true);
            window.removeEventListener("resize", updateRect);
        };
    }, [updateRect]);

    const openModal = (m: ModalType) => {
        setOpen(false);
        setModal(m);
    };

    const menuItems = [
        {
            label: "Profile Settings",
            desc: "Update username & session details",
            icon: <User size={15} />,
            action: () => openModal("profile"),
            color: "#e4e4e7"
        },
        {
            label: "Change Password",
            desc: "Update your security credentials",
            icon: <KeyRound size={15} />,
            action: () => openModal("security"),
            color: "#e4e4e7"
        },
        {
            label: "Delete Account",
            desc: "Permanently remove your data",
            icon: <AlertTriangle size={15} style={{ color: "#ef4444" }} />,
            action: () => openModal("danger"),
            color: "#ef4444"
        },
        null,
        {
            label: "Sign Out",
            desc: null,
            icon: <LogOut size={15} />,
            action: () => openModal("signout"),
            color: "#e4e4e7"
        },
    ];

    const handleConfirmSignOut = () => {
        setModal(null);
        if (onSignOut) {
            onSignOut();
        }
    };

    return (
        <>
            {/* ── Trigger Button ── */}
            <button
                ref={btnRef}
                onClick={toggleOpen}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 10px",
                    borderRadius: 14,
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    cursor: "pointer",
                    userSelect: "none",
                    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    background: open ? "rgba(255,255,255,0.08)" : "transparent",
                    border: "1px solid transparent",
                    color: open ? "#fff" : "#a1a1aa",
                }}
                onMouseEnter={(e) => {
                    if (!open) {
                        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                        (e.currentTarget as HTMLElement).style.color = "#fff";
                    }
                }}
                onMouseLeave={(e) => {
                    if (!open) {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                        (e.currentTarget as HTMLElement).style.color = "#a1a1aa";
                    }
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: open ? "#34d399" : "inherit",
                        transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.3s",
                        transform: open ? "rotate(180deg) scale(1.1)" : "rotate(0deg) scale(1)",
                    }}
                >
                    <Settings size={15} />
                </div>
                <span className="hidden sm:inline" style={{ paddingRight: 2 }}>Settings</span>
                <span className="hidden sm:inline">
                    <ChevronDown
                        size={13}
                        style={{
                            opacity: open ? 0.8 : 0.4,
                            transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                            transform: open ? "rotate(-180deg)" : "rotate(0deg)"
                        }}
                    />
                </span>
            </button>

            {/* ── Dropdown & Modals via Portal ── */}
            <DropdownPortal open={open || modal !== null} rect={btnRect}>
                {!modal && (
                    <div id="fn-user-dropdown" style={{ width: 252, padding: "6px 6px 8px" }}>
                        {menuItems.map((item, i) =>
                            item === null ? (
                                <div
                                    key={i}
                                    style={{
                                        margin: "6px 0",
                                        borderTop: "1px solid rgba(255,255,255,0.05)",
                                    }}
                                />
                            ) : (
                                <button
                                    key={i}
                                    onClick={item.action}
                                    style={{
                                        width: "100%",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                        padding: "9px 10px",
                                        borderRadius: 10,
                                        cursor: "pointer",
                                        background: "transparent",
                                        border: "none",
                                        color: "#a1a1aa",
                                        transition: "background 0.12s, color 0.12s",
                                        textAlign: "left",
                                    }}
                                    onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLElement).style.background =
                                            "rgba(255,255,255,0.06)";
                                        (e.currentTarget as HTMLElement).style.color = "#f4f4f5";
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLElement).style.background = "transparent";
                                        (e.currentTarget as HTMLElement).style.color = "#a1a1aa";
                                    }}
                                >
                                    <span style={{ flexShrink: 0, opacity: 0.7, display: "flex" }}>
                                        {item.icon}
                                    </span>
                                    <div style={{ minWidth: 0 }}>
                                        <p
                                            style={{
                                                fontSize: 13,
                                                fontWeight: 500,
                                                color: item.color || "#e4e4e7",
                                                letterSpacing: "-0.01em",
                                                margin: 0,
                                            }}
                                        >
                                            {item.label}
                                        </p>
                                        {item.desc && (
                                            <p
                                                style={{
                                                    fontSize: 11,
                                                    color: "#71717a",
                                                    marginTop: 2,
                                                    fontWeight: 400,
                                                    margin: "3px 0 0",
                                                }}
                                            >
                                                {item.desc}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            )
                        )}
                    </div>
                )}
                {modal === "profile" && (
                    <ProfileModal onClose={() => setModal(null)} userName={userName} userHandle={userHandle} />
                )}
                {modal === "security" && (
                    <SecurityModal onClose={() => setModal(null)} userName={userName} userHandle={userHandle} />
                )}
                {modal === "danger" && (
                    <DangerModal onClose={() => setModal(null)} userName={userName} userHandle={userHandle} />
                )}
                {modal === "signout" && (
                    <SignOutModal onClose={() => setModal(null)} onConfirm={handleConfirmSignOut} />
                )}
            </DropdownPortal>
        </>
    );
}