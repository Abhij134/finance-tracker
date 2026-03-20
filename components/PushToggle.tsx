"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Switch } from "./ui/switch";

export function PushToggle() {
    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if ("serviceWorker" in navigator && "PushManager" in window) {
            setIsSupported(true);
            checkSubscription();
        } else {
            setIsLoading(false);
        }
    }, []);

    const checkSubscription = async () => {
        try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                const subscription = await registration.pushManager.getSubscription();
                setIsSubscribed(!!subscription);
            } else {
                setIsSubscribed(false);
            }
        } catch (error) {
            console.error("Error checking push subscription:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const subscribeToPush = async () => {
        setIsLoading(true);
        try {
            const permission = await Notification.requestPermission();

            if (permission !== "granted") {
                console.warn("Notification permission denied");
                setIsLoading(false);
                return;
            }

            const registration = await navigator.serviceWorker.register("/sw.js");
            await navigator.serviceWorker.ready;

            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapidPublicKey) {
                console.error("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY");
                setIsLoading(false);
                return;
            }

            const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey,
            });

            // Send to our backend
            const response = await fetch("/api/web-push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(subscription),
            });

            if (response.ok) {
                setIsSubscribed(true);
                console.log("Successfully subscribed to push notifications");
            } else {
                console.error("Failed to save subscription on server");
            }
        } catch (error) {
            console.error("Failed to subscribe to push notifications:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const unsubscribeFromPush = async () => {
        setIsLoading(true);
        try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                const subscription = await registration.pushManager.getSubscription();
                if (subscription) {
                    await subscription.unsubscribe();

                    // Note: Optional step to send an API request to delete the subscription from the DB
                    // await fetch("/api/web-push/unsubscribe", { method: "DELETE" });

                    setIsSubscribed(false);
                }
            }
        } catch (error) {
            console.error("Error unsubscribing:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Helper to convert VAPID key
    function urlBase64ToUint8Array(base64String: string) {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    if (!isSupported) {
        return (
            <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-xl border border-border flex items-center gap-3">
                <BellOff className="h-5 w-5 text-muted-foreground" />
                <span>Push notifications are not supported in this browser.</span>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border backdrop-blur-md">
            <div>
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Bell className="h-4 w-4 text-emerald-500" />
                    Budget Alerts
                </h4>
                <p className="text-xs text-muted-foreground mt-1">Receive push notifications when you exceed your budget.</p>
            </div>

            <Switch
                checked={isSubscribed}
                onChange={isSubscribed ? unsubscribeFromPush : subscribeToPush}
                loading={isLoading}
                ariaLabel="Toggle budget alerts"
            />
        </div>
    );
}
