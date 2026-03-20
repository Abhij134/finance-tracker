"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronDown } from "lucide-react";

interface CustomDateRangePickerProps {
    from: string;
    to: string;
    onRangeChange: (from: string, to: string) => void;
    defaultOpen?: boolean;
    align?: "center" | "right";
}

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
}

function getLocalYYYYMMDD(d: Date) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

const todayStr = getLocalYYYYMMDD(new Date());

export function CustomDateRangePicker({ from, to, onRangeChange, defaultOpen = false, align = "center" }: CustomDateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const [viewDate, setViewDate] = useState(() => {
        const active = from ? new Date(from) : new Date();
        return new Date(active.getFullYear(), active.getMonth(), 1);
    });

    const [selectingHint, setSelectingHint] = useState<"from" | "to">("from");
    const [hoverDate, setHoverDate] = useState<string | null>(null);
    const [showYearPicker, setShowYearPicker] = useState(false);
    const yearGridRef = useRef<HTMLDivElement>(null);

    const currentYear = new Date().getFullYear();
    const yearRangeStart = currentYear - 15;
    const yearRangeEnd = currentYear + 10;
    const yearList = Array.from({ length: yearRangeEnd - yearRangeStart + 1 }, (_, i) => yearRangeStart + i);

    // Scroll selected year into view when year picker opens
    useEffect(() => {
        if (showYearPicker && yearGridRef.current) {
            const activeBtn = yearGridRef.current.querySelector('[data-active-year="true"]');
            if (activeBtn) {
                activeBtn.scrollIntoView({ block: "center", behavior: "instant" });
            }
        }
    }, [showYearPicker]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setShowYearPicker(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleDayClick = (dateStr: string) => {
        const fromStr = from ? from.split('T')[0] : "";
        const toStr = to ? to.split('T')[0] : "";

        if (!fromStr || (fromStr && toStr)) {
            onRangeChange(dateStr, "");
            setSelectingHint("to");
        } else {
            if (dateStr < fromStr) {
                onRangeChange(dateStr, fromStr);
            } else if (dateStr === fromStr) {
                // Same date clicked — set both from and to to same date
                onRangeChange(dateStr, dateStr);
            } else {
                onRangeChange(fromStr, dateStr);
            }
            setSelectingHint("from");
            setTimeout(() => setIsOpen(false), 350);
        }
    };

    const setPresetRange = (preset: "7d" | "30d") => {
        const today = new Date();
        let fromDate: Date = today;
        let toDate: Date = today;

        if (preset === "7d") {
            fromDate = new Date();
            fromDate.setDate(today.getDate() - 6);
            toDate = today;
        } else if (preset === "30d") {
            fromDate = new Date();
            fromDate.setDate(today.getDate() - 29);
            toDate = today;
        }

        onRangeChange(getLocalYYYYMMDD(fromDate), getLocalYYYYMMDD(toDate));
        setIsOpen(false);
    };

    const nextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
        setShowYearPicker(false);
    };
    const prevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
        setShowYearPicker(false);
    };

    const calendarDays = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const days: (string | null)[] = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`);
        }
        return days;
    }, [viewDate]);

    const displayFormat = (dateStr: string) => {
        if (!dateStr) return "";
        const cleanDate = dateStr.split("T")[0];
        const parts = cleanDate.split("-");
        if (parts.length !== 3) return cleanDate;
        const [y, m, d] = parts;
        const monthIdx = parseInt(m, 10) - 1;
        if (monthIdx < 0 || monthIdx > 11) return cleanDate;

        const currentYear = new Date().getFullYear().toString();
        if (y === currentYear) {
            return `${parseInt(d, 10)} ${MONTHS[monthIdx].slice(0, 3)}`;
        }
        return `${parseInt(d, 10)} ${MONTHS[monthIdx].slice(0, 3)} '${y.slice(-2)}`;
    };

    return (
        <div className="relative w-full min-w-0" ref={containerRef}>
            {/* Trigger Button */}
            <button
                type="button" onClick={() => { setIsOpen(!isOpen); setShowYearPicker(false); }}
                className="flex w-full items-center justify-between gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-zinc-700/30 shadow-sm focus:outline-none"
            >
                <div className="flex items-center gap-1.5 overflow-hidden">
                    <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {from && to ? (
                        <span className="truncate text-[11px] leading-tight text-foreground">
                            {displayFormat(from)} — {displayFormat(to)}
                        </span>
                    ) : (
                        <span className="truncate text-[11px] leading-tight opacity-80">Select Date</span>
                    )}
                </div>
                <ChevronDown className={`h-3 w-3 shrink-0 text-muted-foreground opacity-70 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div
                    className={`${isMobile ? "fixed" : "absolute"} top-full mt-2 w-[min(350px,calc(100vw-1rem))] shadow-2xl z-[100] rounded-2xl border border-border/60 bg-[#0c1117]/98 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200`}
                    style={{
                        boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(16,185,129,0.04)",
                        top: isMobile ? "140px" : "auto",
                        right: isMobile ? "auto" : (align === "right" ? 0 : "auto"),
                        left: isMobile ? "50%" : (align === "center" ? "50%" : "0"),
                        transform: isMobile || align === "center" ? "translateX(-50%)" : "none"
                    }}
                >
                    <div className="flex">
                        {/* Left Panel: Presets */}
                        <div className="w-[32%] border-r border-border/40 p-3 flex flex-col gap-1">
                            <h3 className="text-[10px] font-semibold text-muted-foreground/70 px-2 mb-1.5 uppercase tracking-wider">Quick</h3>
                            {[
                                { label: "Last 7 Days", value: "7d" as const },
                                { label: "Last 30 Days", value: "30d" as const },
                            ].map((p) => (
                                <button
                                    key={p.value}
                                    onClick={() => setPresetRange(p.value)}
                                    className="w-full text-left text-[11px] px-2.5 py-2 rounded-lg hover:bg-white/[0.04] text-zinc-300 hover:text-white leading-tight transition-all duration-150"
                                >
                                    {p.label}
                                </button>
                            ))}

                            {/* Selected range display */}
                            {from && to && (
                                <div className="mt-auto pt-3 border-t border-border/30">
                                    <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider px-2 mb-1">Selected</p>
                                    <div className="px-2 py-1.5 rounded-lg bg-primary/5 border border-primary/20">
                                        <p className="text-[10px] text-primary font-medium leading-tight">
                                            {displayFormat(from)}
                                        </p>
                                        <p className="text-[9px] text-muted-foreground/40 my-0.5">to</p>
                                        <p className="text-[10px] text-primary font-medium leading-tight">
                                            {displayFormat(to)}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Panel: Calendar */}
                        <div className="flex-1 p-3 pl-4">
                            {/* Month/Year header */}
                            <div className="flex items-center justify-between pb-3 mb-1">
                                <button
                                    onClick={prevMonth}
                                    className="rounded-lg p-1.5 text-zinc-500 transition-all duration-150 hover:bg-white/[0.06] hover:text-zinc-200 active:scale-90"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={() => setShowYearPicker(!showYearPicker)}
                                    className={`text-[13px] font-semibold flex items-center gap-1 px-3 py-1 rounded-lg transition-all duration-200 cursor-pointer ${showYearPicker
                                        ? "bg-primary/10 text-primary border border-primary/30"
                                        : "text-zinc-200 hover:bg-white/[0.06] hover:text-white"
                                        }`}
                                >
                                    <span>{MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
                                    <ChevronDown className={`h-3 w-3 opacity-40 transition-transform duration-300 ${showYearPicker ? "rotate-180" : ""}`} />
                                </button>
                                <button
                                    onClick={nextMonth}
                                    className="rounded-lg p-1.5 text-zinc-500 transition-all duration-150 hover:bg-white/[0.06] hover:text-zinc-200 active:scale-90"
                                >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                            </div>

                            {showYearPicker ? (
                                /* ── Year picker grid ── */
                                <div
                                    ref={yearGridRef}
                                    className="grid grid-cols-4 gap-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar"
                                >
                                    {yearList.map((year) => {
                                        const isCurrentYear = year === currentYear;
                                        const isViewYear = year === viewDate.getFullYear();
                                        return (
                                            <button
                                                key={year}
                                                data-active-year={isViewYear ? "true" : undefined}
                                                onClick={() => {
                                                    setViewDate(new Date(year, viewDate.getMonth(), 1));
                                                    setShowYearPicker(false);
                                                }}
                                                className={`
                                                    py-2.5 rounded-lg text-[11px] font-medium transition-all duration-200
                                                    ${isViewYear
                                                        ? "border border-primary/50 bg-primary/10 text-primary font-bold shadow-[0_0_12px_rgba(16,185,129,0.12)]"
                                                        : isCurrentYear
                                                            ? "text-primary bg-primary/[0.04] hover:bg-primary/10 ring-1 ring-primary/20"
                                                            : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
                                                    }
                                                `}
                                            >
                                                {year}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <>
                                    {/* Day headers */}
                                    <div className="grid grid-cols-7 gap-0 text-center mb-2">
                                        {DAYS.map((d) => (
                                            <div key={d} className="text-[9px] font-semibold uppercase tracking-widest text-zinc-600 py-1">
                                                {d}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Calendar grid */}
                                    <div className="grid grid-cols-7 gap-y-0.5 gap-x-0" onMouseLeave={() => setHoverDate(null)}>
                                        {calendarDays.map((dateStr, i) => {
                                            if (!dateStr) return <div key={`empty-${i}`} className="h-8 w-full" />;

                                            const dayNum = parseInt(dateStr.split("-")[2]);
                                            const isToday = dateStr === todayStr;
                                            const fromStr = from ? from.split('T')[0] : "";
                                            const toStr = to ? to.split('T')[0] : "";
                                            const hoverStr = hoverDate ? hoverDate.split('T')[0] : "";

                                            const isSelectedFrom = fromStr && dateStr === fromStr;
                                            const isSelectedTo = toStr && dateStr === toStr;
                                            const isSelecting = selectingHint === "to" && fromStr && !toStr;

                                            let isInRange = false;
                                            if (fromStr && toStr && dateStr > fromStr && dateStr < toStr) {
                                                isInRange = true;
                                            } else if (isSelecting && hoverStr) {
                                                const min = fromStr < hoverStr ? fromStr : hoverStr;
                                                const max = fromStr > hoverStr ? fromStr : hoverStr;
                                                if (dateStr > min && dateStr < max) isInRange = true;
                                            }

                                            const isEndpoint = isSelectedFrom || isSelectedTo || (isSelecting && dateStr === hoverStr);

                                            // Determine range sides for background connectors
                                            const effectiveTo = toStr || hoverStr;
                                            const hasRangeRight = isSelectedFrom && effectiveTo && dateStr < effectiveTo;
                                            const hasRangeLeft = (isSelectedTo && fromStr && dateStr > fromStr) ||
                                                (isSelecting && dateStr === hoverStr && hoverStr > fromStr);
                                            const hasRangeLeftReverse = isSelecting && dateStr === hoverStr && hoverStr < fromStr;

                                            return (
                                                <button
                                                    key={dateStr}
                                                    onClick={() => handleDayClick(dateStr)}
                                                    onMouseEnter={() => setHoverDate(dateStr)}
                                                    className="relative flex items-center justify-center h-8 w-full group"
                                                >
                                                    {/* Range background connector */}
                                                    {isInRange && (
                                                        <div className="absolute inset-y-[3px] -left-px -right-px bg-primary/[0.08]" />
                                                    )}
                                                    {hasRangeRight && (
                                                        <div className="absolute inset-y-[3px] right-0 w-1/2 bg-primary/[0.08]" />
                                                    )}
                                                    {hasRangeLeft && (
                                                        <div className="absolute inset-y-[3px] left-0 w-1/2 bg-primary/[0.08]" />
                                                    )}
                                                    {hasRangeLeftReverse && (
                                                        <div className="absolute inset-y-[3px] right-0 w-1/2 bg-primary/[0.08]" />
                                                    )}

                                                    {/* Day number circle */}
                                                    <span
                                                        className={`
                                                            relative z-10 flex items-center justify-center w-7 h-7 rounded-full text-[11px] transition-all duration-200
                                                            ${isEndpoint
                                                                ? "bg-primary/15 text-primary border border-primary/50 font-bold shadow-[0_0_12px_rgba(16,185,129,0.15)] scale-110"
                                                                : isInRange
                                                                    ? "text-primary/90 font-medium"
                                                                    : isToday
                                                                        ? "text-white font-semibold"
                                                                        : "text-zinc-400 group-hover:text-white group-hover:bg-white/[0.06]"
                                                            }
                                                        `}
                                                    >
                                                        {dayNum}
                                                        {/* Today dot indicator */}
                                                        {isToday && !isEndpoint && (
                                                            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary shadow-[0_0_4px_rgba(16,185,129,0.6)]" />
                                                        )}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 border-t border-border/30 px-4 py-2.5 bg-white/[0.01] rounded-b-2xl">
                        <span className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${selectingHint === "from" ? "bg-primary/60 shadow-[0_0_4px_rgba(16,185,129,0.4)]" : "bg-amber-400/60 shadow-[0_0_4px_rgba(251,191,36,0.4)]"}`} />
                            {selectingHint === "from" ? "Click a start date" : "Now click an end date"}
                        </span>
                        {(from || to) && (
                            <button
                                onClick={() => { onRangeChange("", ""); setSelectingHint("from"); }}
                                className="text-zinc-500 hover:text-red-400 font-medium transition-colors duration-150 px-2 py-0.5 rounded hover:bg-red-400/10"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}