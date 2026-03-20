"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
    FileDown,
    Download,
    Sparkles,
    ChevronDown,
    Check,
} from "lucide-react";
import { toast } from "sonner";
import { CustomDateRangePicker } from "@/components/custom-date-picker";

// ─── Export Dropdown Component ────────────────────────────────────────────────
export function ExportDropdown() {
    const [open, setOpen] = useState(false);
    const [btnRect, setBtnRect] = useState<DOMRect | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);

    const [dateRangeMode, setDateRangeMode] = useState<"all" | "custom">("all");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");

    const [insightsEnabled, setInsightsEnabled] = useState(false);
    const [exporting, setExporting] = useState<"pdf" | null>(null);
    const [done, setDone] = useState<"pdf" | null>(null);

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
                const dropEl = document.getElementById("fn-export-dropdown");
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

    const handleExport = async (format: "pdf") => {
        setExporting(format);
        try {
            const params = new URLSearchParams({
                format,
                insights: insightsEnabled ? "true" : "false",
            });

            if (dateRangeMode === "custom") {
                if (!customFrom || !customTo) {
                    toast.error("Please select a complete start and end date range.");
                    setExporting(null);
                    return;
                }
                params.append("from", new Date(customFrom).toISOString());
                params.append("to", new Date(customTo).toISOString());
            }

            const response = await fetch(`/api/user/export?${params.toString()}`);
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || "Export failed");
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = "finance-neo-export.pdf";
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 100);

            setDone(format);
            toast.custom(() => (
                <div style={{ display: "flex", gap: 10, alignItems: "center", background: "#0e1118", border: "1px solid rgba(16, 185, 129, 0.25)", padding: "14px 18px", borderRadius: 12, color: "#10b981", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                    <Check size={18} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>Exported successfully</span>
                </div>
            ), { duration: 3000, position: "bottom-right" });

            setTimeout(() => {
                setDone(null);
                setOpen(false);
            }, 1000);
        } catch (err: any) {
            toast.error(err.message || "Failed to export.");
        } finally {
            setExporting(null);
        }
    };

    return (
        <>
            <button
                ref={btnRef}
                onClick={toggleOpen}
                style={{
                    position: "relative",
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
            >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: open ? "#34d399" : "inherit" }}>
                    <FileDown size={15} />
                </div>
                <span className="hidden sm:inline" style={{ paddingRight: 2 }}>Export</span>
                <span className="hidden sm:inline">
                    <ChevronDown size={13} style={{ opacity: open ? 0.8 : 0.4, transition: "transform 0.3s", transform: open ? "rotate(-180deg)" : "rotate(0deg)" }} />
                </span>
            </button>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            {open && (
                <div
                    onClick={() => setOpen(false)}
                    style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 99997 }}
                    className="sm:hidden"
                />
            )}

            <ExportPortal open={open} rect={btnRect}>
                <div style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: 12, color: "#a1a1aa", marginBottom: 0, marginTop: -4 }}>Download transactions as PDF</p>
                </div>

                <div style={{ marginBottom: 14 }}>
                    <p style={{ fontSize: 10, color: "#71717a", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Time Range</p>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <button
                            onClick={() => setDateRangeMode("all")}
                            style={{
                                flex: "0 0 auto", padding: "7px 12px", whiteSpace: "nowrap", borderRadius: 8, fontSize: 11, fontWeight: 600,
                                border: dateRangeMode === "all" ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(255,255,255,0.08)",
                                background: dateRangeMode === "all" ? "rgba(16,185,129,0.1)" : "transparent",
                                color: dateRangeMode === "all" ? "#34d399" : "#a1a1aa", cursor: "pointer", transition: "all 0.15s"
                            }}
                        >
                            All Time
                        </button>
                        <div style={{ flex: "1 1 auto", minWidth: 0, zIndex: 99999 }}>
                            <CustomDateRangePicker
                                from={dateRangeMode === "custom" ? customFrom : ""}
                                to={dateRangeMode === "custom" ? customTo : ""}
                                onRangeChange={(from, to) => {
                                    setDateRangeMode("custom");
                                    setCustomFrom(from);
                                    setCustomTo(to);
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
                    <label style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: insightsEnabled ? "rgba(16,185,129,0.05)" : "rgba(255,255,255,0.02)", border: insightsEnabled ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(255,255,255,0.06)", borderRadius: 12, cursor: "pointer" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ height: 26, width: 26, borderRadius: 8, background: insightsEnabled ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", color: insightsEnabled ? "#10b981" : "#a1a1aa" }}>
                                <Sparkles size={14} />
                            </div>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: insightsEnabled ? "#34d399" : "#e4e4e7" }}>AI Insights</p>
                        </div>
                        <div style={{ width: 34, height: 18, borderRadius: 16, background: insightsEnabled ? "#10b981" : "rgba(255,255,255,0.1)", position: "relative" }}>
                            <div style={{ position: "absolute", top: 2, left: insightsEnabled ? 18 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "all 0.2s" }} />
                        </div>
                        <input type="checkbox" checked={insightsEnabled} onChange={e => setInsightsEnabled(e.target.checked)} style={{ display: "none" }} />
                    </label>

                    <button
                        onClick={() => handleExport("pdf")}
                        disabled={!!exporting}
                        style={{
                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: "0 18px", borderRadius: 12,
                            border: "1px solid rgba(16,185,129,0.5)", background: "linear-gradient(135deg,rgba(16,185,129,0.15),rgba(16,185,129,0.05))",
                            cursor: exporting ? "not-allowed" : "pointer", color: "#10b981", minWidth: 80
                        }}
                    >
                        {done === "pdf" ? <Check size={18} /> : exporting === "pdf" ? <div style={{ height: 18, width: 18, borderRadius: "50%", border: "2px solid rgba(16,185,129,0.3)", borderTopColor: "#10b981", animation: "spin 0.7s linear infinite" }} /> : <Download size={18} />}
                        <span style={{ fontSize: 11, fontWeight: 600 }}>PDF</span>
                    </button>
                </div>
            </ExportPortal>
        </>
    );
}

function ExportPortal({ open, rect, children }: { open: boolean; rect: DOMRect | null; children: React.ReactNode; }) {
    if (!open || !rect || typeof document === "undefined") return null;

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const dropdownWidth = isMobile ? Math.min(340, window.innerWidth - 32) : 280;

    // Positioning logic
    const top = isMobile ? 80 : rect.bottom + 8;
    const left = isMobile ? "50%" : "auto";
    const right = isMobile ? "auto" : Math.max(8, Math.min(window.innerWidth - rect.right, window.innerWidth - 8 - dropdownWidth));
    const transform = isMobile ? "translateX(-50%)" : "none";

    return createPortal(
        <div style={{
            position: isMobile ? "fixed" : "absolute",
            top, left, right, transform,
            zIndex: 99998,
            animation: isMobile ? "fadeInMobile 0.2s ease-out" : "dropIn 0.18s cubic-bezier(0.34,1.4,0.64,1)",
            transformOrigin: isMobile ? "center" : "top right",
            background: "linear-gradient(160deg,#0e1118,#090c10)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16, boxShadow: "0 0 0 1px rgba(0,0,0,0.7), 0 24px 60px rgba(0,0,0,0.8)", overflow: "visible"
        }}>
            <div id="fn-export-dropdown" style={{ width: dropdownWidth, display: "flex", flexDirection: "column", padding: "16px 16px 20px" }}>
                {children}
            </div>
            <style>{`
                @keyframes dropIn { from { opacity:0; transform:scale(0.94) translateY(-6px); } to { opacity:1; transform:scale(1) translateY(0); } }
                @keyframes fadeInMobile { from { opacity:0; transform:translate(-50%, -10px); } to { opacity:1; transform:translate(-50%, 0); } }
            `}</style>
        </div>,
        document.body
    );
}
