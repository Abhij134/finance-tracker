"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

const getNavIndex = (path: string) => {
    if (path === "/") return 0;
    if (path.startsWith("/dashboard")) return 1;
    if (path.startsWith("/transactions")) return 2;
    if (path.startsWith("/account")) return 3;
    if (path.startsWith("/alerts")) return 4;
    return 99;
};

let prevPath = "";
let currentDir = 1;

const variants = {
    initial: (dir: number) => ({ y: dir > 0 ? 20 : -20, opacity: 0 }),
    animate: { y: 0, opacity: 1 },
};

export function PageTransition({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    if (typeof window !== "undefined" && pathname !== prevPath) {
        if (prevPath !== "") {
            const prevIdx = getNavIndex(prevPath);
            const currIdx = getNavIndex(pathname);
            currentDir = currIdx >= prevIdx ? 1 : -1;
        }
        prevPath = pathname;
    }

    return (
        <motion.div
            key={pathname}
            custom={currentDir}
            variants={variants}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full h-full"
        >
            {children}
        </motion.div>
    );
}
