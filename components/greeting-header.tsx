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
        <div className="px-1 mt-2 mb-4">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                {greeting}, <span className="text-emerald-500 font-bold">{userName}</span>
            </h2>
        </div>
    );
}
