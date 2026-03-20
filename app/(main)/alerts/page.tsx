"use client";

import { useState, useEffect } from "react";
import { PushToggle } from "@/components/PushToggle";
import { Mail, Smartphone, ShieldAlert, Loader2 } from "lucide-react";
import { getEmailPreferences, updateEmailPreference } from "@/app/actions/alerts";
import { toast } from "sonner"; // Using toast if available in project

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
    description: "Send me a summary of my spending every Monday.",
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

function EmailToggle({ enabled, setEnabled, loading, disabled }: { enabled: boolean, setEnabled: () => void, loading?: boolean, disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={loading || disabled}
      className={`${enabled ? 'bg-emerald-500' : 'bg-muted-foreground/30'
        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50`}
      role="switch"
      aria-checked={enabled}
      onClick={setEnabled}
    >
      <span
        aria-hidden="true"
        className={`${enabled ? 'translate-x-5' : 'translate-x-0'
          } pointer-events-none flex items-center justify-center h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
      >
        {loading && <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />}
      </span>
    </button>
  );
}

export default function AlertsPage() {
  const [preferences, setPreferences] = useState({
    largeTxEmailEnabled: true,
    largeTxThreshold: 500,
    periodicSummaryEmailEnabled: true,
    unusualSpendingEmailEnabled: true,
    unusualSpendingThreshold: 80,
  });

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [updatingStates, setUpdatingStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadData() {
      const res = await getEmailPreferences();
      if (res.success && res.preferences) {
        setPreferences({
          largeTxEmailEnabled: res.preferences.largeTxEmailEnabled,
          largeTxThreshold: res.preferences.largeTxThreshold,
          periodicSummaryEmailEnabled: res.preferences.periodicSummaryEmailEnabled,
          unusualSpendingEmailEnabled: res.preferences.unusualSpendingEmailEnabled,
          unusualSpendingThreshold: res.preferences.unusualSpendingThreshold,
        });
      }
      setLoadingInitial(false);
    }
    loadData();
  }, []);

  const handleToggle = async (dbKey: string | null) => {
    if (!dbKey) return; // Coming soon feature

    const currentVal = preferences[dbKey as keyof typeof preferences] as boolean;
    const newVal = !currentVal;

    // Optimistic Update
    setPreferences(prev => ({ ...prev, [dbKey as any]: newVal }));
    setUpdatingStates(prev => ({ ...prev, [dbKey]: true }));

    const res = await updateEmailPreference(dbKey as any, newVal);

    setUpdatingStates(prev => ({ ...prev, [dbKey]: false }));

    if (res.success) {
      toast?.success("Alert preferences updated");
    } else {
      toast?.error(res.error || "Failed to update preference");
      // Revert on failure
      setPreferences(prev => ({ ...prev, [dbKey as any]: currentVal }));
    }
  };

  const handleSliderChange = async (dbKey: "largeTxThreshold" | "unusualSpendingThreshold", value: number) => {
    const currentVal = preferences[dbKey] as number;

    // Opt. update 
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
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          Alerts & Notifications
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
                // Determine true active state from DB if dbKey exists
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
                      <EmailToggle
                        enabled={isActive}
                        setEnabled={() => handleToggle(setting.dbKey)}
                        loading={isUpdating}
                        disabled={!setting.dbKey}
                      />
                    </div>
                    {/* Conditional Settings Sliders */}
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
      </div >
    </div >
  );
}
