"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function useAddToHomeScreen() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [canInstall, setCanInstall] = useState(false);

    useEffect(() => {
        // Check if already installed (standalone mode)
        if (window.matchMedia("(display-mode: standalone)").matches) {
            setIsInstalled(true);
            return;
        }

        // Detect iOS
        const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
        setIsIOS(ios);
        if (ios) {
            setCanInstall(true); // iOS shows manual instructions
        }

        // Listen for Chrome/Android install prompt
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setCanInstall(true);
        };

        window.addEventListener("beforeinstallprompt", handler);

        // Listen for successful install
        const installedHandler = () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
            setCanInstall(false);
        };
        window.addEventListener("appinstalled", installedHandler);

        return () => {
            window.removeEventListener("beforeinstallprompt", handler);
            window.removeEventListener("appinstalled", installedHandler);
        };
    }, []);

    const triggerInstall = async () => {
        if (deferredPrompt) {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === "accepted") {
                setIsInstalled(true);
                setCanInstall(false);
            }
            setDeferredPrompt(null);
        }
    };

    return { canInstall, isInstalled, isIOS, triggerInstall };
}
