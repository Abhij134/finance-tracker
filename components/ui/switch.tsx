"use client";

import { useId } from "react";
import { Loader2 } from "lucide-react";

interface SwitchProps {
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
    loading?: boolean;
    ariaLabel?: string;
}

export function Switch({ checked, onChange, disabled, loading, ariaLabel }: SwitchProps) {
    const id = useId();

    return (
        <label className="toggle" htmlFor={id}>
            <input
                type="checkbox"
                className="toggle__input"
                id={id}
                checked={checked}
                onChange={onChange}
                disabled={disabled || loading}
                aria-label={ariaLabel}
            />
            <span className="toggle-track">
                <span className="toggle-indicator">
                    <span className="checkMark">
                        {loading ? (
                            <Loader2 className="h-2.5 w-2.5 animate-spin text-emerald-500" />
                        ) : (
                            <svg viewBox="0 0 24 24" id="ghq-svg-check" role="presentation" aria-hidden="true">
                                <path d="M9.86 18a1 1 0 01-.73-.32l-4.86-5.17a1.001 1.001 0 011.46-1.37l4.12 4.39 8.41-9.2a1 1 0 111.48 1.34l-9.14 10a1 1 0 01-.73.33h-.01z"></path>
                            </svg>
                        )}
                    </span>
                </span>
            </span>
        </label>
    );
}
