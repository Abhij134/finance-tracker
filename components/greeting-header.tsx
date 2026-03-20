"use client";

import { useEffect, useState } from "react";

export function GreetingHeader({ userName }: { userName: string }) {
    const [greeting, setGreeting] = useState("Welcome back");

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting("Good morning");
        else if (hour < 18) setGreeting("Good afternoon");
        else setGreeting("Good evening");
    }, []);

    return (
        <div className="px-1 mt-2 mb-6">
            <div className="flex flex-col gap-1">
                <p className="text-sm text-muted-foreground font-medium tracking-wide">
                    {greeting} 👋
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                    {userName}
                </h1>
            </div>
        </div>
    );
}
