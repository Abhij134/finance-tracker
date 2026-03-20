"use client";

import { useAddToHomeScreen } from "@/hooks/useAddToHomeScreen";
import { Smartphone, CheckCircle2, Share } from "lucide-react";
import { useState } from "react";

export function AddToHomeScreenRow() {
    const { canInstall, isInstalled, isIOS, triggerInstall } = useAddToHomeScreen();
    const [showIOSGuide, setShowIOSGuide] = useState(false);

    const handleClick = () => {
        if (isInstalled) return;
        if (isIOS) {
            setShowIOSGuide((v) => !v);
        } else {
            triggerInstall();
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Main row — matches FinanceNeo settings card style */}
            <div
                onClick={handleClick}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 16px",
                    borderRadius: 16,
                    border: isInstalled
                        ? "1px solid rgba(16,185,129,0.2)"
                        : "1px solid rgba(255,255,255,0.06)",
                    background: isInstalled
                        ? "rgba(16,185,129,0.05)"
                        : "rgba(255,255,255,0.02)",
                    cursor: isInstalled ? "default" : canInstall || isIOS ? "pointer" : "not-allowed",
                    opacity: isInstalled || canInstall || isIOS ? 1 : 0.5,
                    transition: "all 0.2s ease",
                }}
            >
                {/* Icon */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        border: isInstalled
                            ? "1px solid rgba(16,185,129,0.2)"
                            : "1px solid rgba(255,255,255,0.08)",
                        background: isInstalled
                            ? "rgba(16,185,129,0.1)"
                            : "rgba(255,255,255,0.04)",
                        flexShrink: 0,
                    }}
                >
                    {isInstalled ? (
                        <CheckCircle2 size={18} style={{ color: "#34d399" }} />
                    ) : (
                        <Smartphone size={18} style={{ color: "#71717a" }} />
                    )}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "#fff", margin: 0 }}>
                        {isInstalled ? "App Installed" : "Add to Home Screen"}
                    </p>
                    <p
                        style={{
                            fontSize: 11,
                            color: "#71717a",
                            margin: "3px 0 0",
                            fontWeight: 300,
                        }}
                    >
                        {isInstalled
                            ? "FinanceNeo is installed on your device"
                            : isIOS
                                ? "Tap to see installation steps"
                                : canInstall
                                    ? "Install FinanceNeo as an app"
                                    : "Open in Chrome or Safari to install"}
                    </p>
                </div>

                {/* Right badge */}
                {!isInstalled && (canInstall || isIOS) && (
                    <span
                        style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "4px 10px",
                            borderRadius: 99,
                            background: "rgba(16,185,129,0.1)",
                            color: "#34d399",
                            border: "1px solid rgba(16,185,129,0.2)",
                            flexShrink: 0,
                        }}
                    >
                        {isIOS ? "Guide" : "Install"}
                    </span>
                )}

                {isInstalled && (
                    <span
                        style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "4px 10px",
                            borderRadius: 99,
                            background: "rgba(16,185,129,0.1)",
                            color: "#34d399",
                            border: "1px solid rgba(16,185,129,0.2)",
                            flexShrink: 0,
                        }}
                    >
                        Active
                    </span>
                )}
            </div>

            {/* iOS step-by-step guide — expands inline */}
            {showIOSGuide && isIOS && !isInstalled && (
                <div
                    style={{
                        padding: 16,
                        borderRadius: 16,
                        border: "1px solid rgba(255,255,255,0.06)",
                        background: "rgba(255,255,255,0.02)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                    }}
                >
                    <p
                        style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: "#71717a",
                            textTransform: "uppercase",
                            letterSpacing: "0.12em",
                            margin: 0,
                        }}
                    >
                        How to install on iOS
                    </p>

                    {[
                        {
                            step: "1",
                            icon: <Share size={13} />,
                            text: 'Tap the Share button at the bottom of Safari',
                        },
                        {
                            step: "2",
                            icon: <span style={{ fontSize: 11 }}>⊞</span>,
                            text: 'Scroll down and tap "Add to Home Screen"',
                        },
                        {
                            step: "3",
                            icon: <CheckCircle2 size={13} />,
                            text: 'Tap "Add" — FinanceNeo will appear on your home screen',
                        },
                    ].map(({ step, icon, text }) => (
                        <div
                            key={step}
                            style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 24,
                                    height: 24,
                                    borderRadius: "50%",
                                    background: "rgba(16,185,129,0.1)",
                                    border: "1px solid rgba(16,185,129,0.2)",
                                    color: "#34d399",
                                    flexShrink: 0,
                                    marginTop: 1,
                                }}
                            >
                                {icon}
                            </div>
                            <p
                                style={{
                                    fontSize: 12,
                                    color: "#a1a1aa",
                                    fontWeight: 300,
                                    lineHeight: 1.5,
                                    margin: 0,
                                }}
                            >
                                {text}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
