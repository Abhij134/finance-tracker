"use client";

import { useState, useEffect } from "react";
import { PushToggle } from "@/components/PushToggle";
import { Mail, Smartphone, ShieldAlert, Loader2, ChevronDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { getEmailPreferences, updateEmailPreference, updateSummaryDay } from "@/app/actions/alerts";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const DAYS_OF_WEEK = [
  { value: "MONDAY",    label: "Monday" },
  { value: "TUESDAY",   label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY",  label: "Thursday" },
  { value: "FRIDAY",    label: "Friday" },
  { value: "SATURDAY",  label: "Saturday" },
  { value: "SUNDAY",    label: "Sunday" },
];

const alertSettingsList = [
  {
    id: "large-transactions",
    dbKey: "largeTxEmailEnabled",
    name: "Large Transactions (Email)",
    description: "Notify me when a transaction exceeds your set threshold.",
    icon: <Mail className="h-5 w-5 text-muted-foreground" />
  },
  {
    id: "weekly-summary",
    dbKey: "periodicSummaryEmailEnabled",
    name: "Weekly Summary (Email)",
    description: "Send me a summary of my spending on your chosen day.",
    icon: <Mail className="h-5 w-5 text-muted-foreground" />
  },
  {
    id: "unusual-spending",
    dbKey: "unusualSpendingEmailEnabled",
    name: "Unusual Spending Detected (In-App & Email)",
    description: "AI anomaly detection for unusual spending patterns.",
    icon: <ShieldAlert className="h-5 w-5 text-muted-foreground" />
  },
];

export default function AlertsPage() {
  const [preferences, setPreferences] = useState({
    largeTxEmailEnabled: true,
    largeTxThreshold: 500,
    periodicSummaryEmailEnabled: true,
    summaryDay: "MONDAY",
    unusualSpendingEmailEnabled: true,
    unusualSpendingThreshold: 80,
  });

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [updatingStates, setUpdatingStates] = useState<Record<string, boolean>>({});
  const [testingSummary, setTestingSummary] = useState(false);

  useEffect(() => {
    async function loadData() {
      const res = await getEmailPreferences();
      if (res.success && res.preferences) {
        setPreferences({
          largeTxEmailEnabled: res.preferences.largeTxEmailEnabled,
          largeTxThreshold: res.preferences.largeTxThreshold,
          periodicSummaryEmailEnabled: res.preferences.periodicSummaryEmailEnabled,
          summaryDay: (res.preferences as any).summaryDay ?? "MONDAY",
          unusualSpendingEmailEnabled: res.preferences.unusualSpendingEmailEnabled,
          unusualSpendingThreshold: res.preferences.unusualSpendingThreshold,
        });
      }
      setLoadingInitial(false);
    }
    loadData();
  }, []);

  const handleToggle = async (dbKey: string | null) => {
    if (!dbKey) return;

    const currentVal = preferences[dbKey as keyof typeof preferences] as boolean;
    const newVal = !currentVal;

    setPreferences(prev => ({ ...prev, [dbKey as any]: newVal }));
    setUpdatingStates(prev => ({ ...prev, [dbKey]: true }));

    const res = await updateEmailPreference(dbKey as any, newVal);

    setUpdatingStates(prev => ({ ...prev, [dbKey]: false }));

    if (res.success) {
      toast?.success("Alert preferences updated");
    } else {
      toast?.error(res.error || "Failed to update preference");
      setPreferences(prev => ({ ...prev, [dbKey as any]: currentVal }));
    }
  };

  const handleSliderChange = async (dbKey: "largeTxThreshold" | "unusualSpendingThreshold", value: number) => {
    const currentVal = preferences[dbKey] as number;

    setPreferences(prev => ({ ...prev, [dbKey]: value }));
    setUpdatingStates(prev => ({ ...prev, [dbKey]: true }));

    const res = await updateEmailPreference(dbKey, value);

    setUpdatingStates(prev => ({ ...prev, [dbKey]: false }));

    if (res.success) {
      toast?.success("Threshold updated successfully");
    } else {
      toast?.error(res.error || "Failed to update threshold");
      setPreferences(prev => ({ ...prev, [dbKey]: currentVal }));
    }
  };

  const handleSummaryDayChange = async (day: string) => {
    const prevDay = preferences.summaryDay;
    setPreferences(prev => ({ ...prev, summaryDay: day }));
    setUpdatingStates(prev => ({ ...prev, summaryDay: true }));

    const res = await updateSummaryDay(day);

    setUpdatingStates(prev => ({ ...prev, summaryDay: false }));

    if (res.success) {
      const label = DAYS_OF_WEEK.find(d => d.value === day)?.label ?? day;
      toast?.success(`Weekly summary will be sent every ${label}`);
    } else {
      toast?.error(res.error || "Failed to update summary day");
      setPreferences(prev => ({ ...prev, summaryDay: prevDay }));
    }
  };

  const handleSendTestSummary = async () => {
    setTestingSummary(true);
    const toastId = toast.loading("Sending test summary email...");
    try {
      const res = await fetch("/api/test-summary");
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Test email sent successfully", { id: toastId });
      } else {
        toast.error(data.error || "Failed to send test email", { id: toastId });
      }
    } catch (err) {
      toast.error("Network error sending test email", { id: toastId });
    } finally {
      setTestingSummary(false);
    }
  };

  return (
    <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 w-full max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          Alerts &amp; Notifications
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage how FinanceNeo keeps you informed about your finances.
        </p>
      </div>

      <div className="space-y-8">
        {/* Real Push Notification Setting */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-foreground">Device Push Notifications</h2>
          </div>
          <div className="rounded-xl shadow-md overflow-hidden">
            <PushToggle />
          </div>
        </section>

        {/* Email Alerts powered by Nodemailer */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-foreground">Email Alerts</h2>
          </div>

          <div className="rounded-xl border border-border bg-card text-card-foreground shadow-md backdrop-blur-sm relative min-h-[150px]">
            {loadingInitial && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
              </div>
            )}

            <div className="divide-y divide-border">
              {alertSettingsList.map((setting) => {
                const isActive = setting.dbKey
                  ? (preferences[setting.dbKey as keyof typeof preferences] as boolean)
                  : false;

                const isUpdating = setting.dbKey ? !!updatingStates[setting.dbKey] : false;

                return (
                  <div key={setting.id} className={`p-6 ${!setting.dbKey ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-4">
                        <div className="mt-1">{setting.icon}</div>
                        <div>
                          <h3 className="text-base font-semibold leading-6 text-foreground">
                            {setting.name}
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {setting.description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={isActive}
                        onChange={() => handleToggle(setting.dbKey)}
                        loading={isUpdating}
                        disabled={!setting.dbKey}
                        ariaLabel={setting.name}
                      />
                    </div>

                    {/* Large Tx Threshold Slider */}
                    {setting.dbKey === "largeTxEmailEnabled" && isActive && (
                      <div className="mt-4 pl-9 pr-2">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-emerald-500/80">Alert threshold: ₹{preferences.largeTxThreshold}</span>
                          <span className="text-xs text-muted-foreground/60">{isUpdating ? "Saving..." : ""}</span>
                        </div>
                        <input
                          type="range"
                          min="100"
                          max="10000"
                          step="100"
                          value={preferences.largeTxThreshold}
                          onChange={(e) => setPreferences(prev => ({ ...prev, largeTxThreshold: Number(e.target.value) }))}
                          onMouseUp={(e) => handleSliderChange("largeTxThreshold", Number((e.target as HTMLInputElement).value))}
                          onTouchEnd={(e) => handleSliderChange("largeTxThreshold", Number((e.target as HTMLInputElement).value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-emerald-500"
                        />
                      </div>
                    )}

                    {/* Weekly Summary Day Picker */}
                    {setting.dbKey === "periodicSummaryEmailEnabled" && isActive && (
                      <AnimatePresence>
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pl-9 pr-2">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-emerald-500/80">Send my summary every</span>
                              {updatingStates.summaryDay && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                              )}
                            </div>
                            <div className="relative">
                              <select
                                value={preferences.summaryDay}
                                onChange={(e) => handleSummaryDayChange(e.target.value)}
                                disabled={updatingStates.summaryDay}
                                className="w-full appearance-none rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 pr-10 text-sm font-medium text-zinc-100 shadow-sm transition-colors hover:border-emerald-500/50 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {DAYS_OF_WEEK.map((day) => (
                                  <option key={day.value} value={day.value}>
                                    {day.label}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                            </div>
                            
                            <div className="mt-3 flex justify-end">
                              <button
                                onClick={handleSendTestSummary}
                                disabled={testingSummary}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-md hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {testingSummary ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                                Send Test Summary
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    )}

                    {/* Unusual Spending Threshold Slider */}
                    {setting.dbKey === "unusualSpendingEmailEnabled" && isActive && (
                      <div className="mt-4 pl-9 pr-2">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-emerald-500/80">Alert me when predicted spending reaches {preferences.unusualSpendingThreshold}% of budget limit</span>
                          <span className="text-xs text-muted-foreground/60">{isUpdating ? "Saving..." : ""}</span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="150"
                          step="5"
                          value={preferences.unusualSpendingThreshold}
                          onChange={(e) => setPreferences(prev => ({ ...prev, unusualSpendingThreshold: Number(e.target.value) }))}
                          onMouseUp={(e) => handleSliderChange("unusualSpendingThreshold", Number((e.target as HTMLInputElement).value))}
                          onTouchEnd={(e) => handleSliderChange("unusualSpendingThreshold", Number((e.target as HTMLInputElement).value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-emerald-500"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
