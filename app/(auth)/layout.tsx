import { AmbientBackground } from "@/components/ambient-background";

// Auth layout — no sidebar, clean full-screen
export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <AmbientBackground />
            {children}
        </>
    );
}
