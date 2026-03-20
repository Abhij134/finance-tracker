"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface SwitchProps {
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
    loading?: boolean;
    ariaLabel?: string;
}

export function Switch({ checked, onChange, disabled, loading, ariaLabel }: SwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={ariaLabel}
            disabled={disabled || loading}
            onClick={onChange}
            style={{ width: "56px", minWidth: "56px", height: "28px" }}
            className={`
                relative inline-flex shrink-0 cursor-pointer items-center rounded-full
                border transition-all duration-350
                focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4ecca3] focus-visible:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                overflow-hidden
                ${checked
                    ? "border-[rgba(78,204,163,0.35)] shadow-[0_0_16px_rgba(78,204,163,0.2),0_0_32px_rgba(78,204,163,0.08)]"
                    : "border-[#1e2a40] bg-[#111828]"
                }
            `}
        >
            {/* Teal gradient fill — visible when checked */}
            <span
                className="absolute inset-0 rounded-full transition-opacity duration-350"
                style={{
                    background: "linear-gradient(135deg, #4ecca3, #2ab89e)",
                    opacity: checked ? 1 : 0,
                }}
                aria-hidden="true"
            />

            <span className="sr-only">{ariaLabel || "Toggle switch"}</span>

            {/* Knob */}
            <motion.div
                initial={false}
                animate={{ x: checked ? 30 : 4 }}
                transition={{
                    type: "spring",
                    stiffness: 700,
                    damping: 40,
                }}
                className="relative z-10 flex h-[18px] w-[18px] items-center justify-center rounded-full shadow-sm"
                style={{
                    background: checked ? "#ffffff" : "#3a4565",
                    boxShadow: checked ? "0 2px 12px rgba(78,204,163,0.4)" : "none",
                }}
            >
                {/* Knob inner gloss */}
                <span
                    className="absolute inset-[4px] rounded-full transition-colors duration-300"
                    style={{
                        background: checked
                            ? "rgba(78,204,163,0.2)"
                            : "rgba(255,255,255,0.15)",
                    }}
                    aria-hidden="true"
                />

                {loading && (
                    <Loader2 className="relative z-10 h-2.5 w-2.5 animate-spin text-emerald-500" />
                )}
            </motion.div>
        </button>
    );
}
