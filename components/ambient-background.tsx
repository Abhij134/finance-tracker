export function AmbientBackground() {
    return (
        <>
            {/* Ambient Background Orbs (Optimized with radial gradients instead of CSS blur) */}
            <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15)_0%,transparent_60%)] mix-blend-screen pointer-events-none animate-custom-pulse z-[-1]" />
            <div className="fixed bottom-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.15)_0%,transparent_60%)] mix-blend-screen pointer-events-none z-[-1]" />
            <div className="fixed top-[30%] left-[50%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.08)_0%,transparent_60%)] mix-blend-screen pointer-events-none animate-custom-pulse-delayed z-[-1]" />
            <div className="fixed bottom-[10%] left-[0%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.08)_0%,transparent_60%)] mix-blend-screen pointer-events-none z-[-1]" />

            {/* Subtle Grid Overlay */}
            <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none opacity-50 z-[-1]" />
        </>
    );
}
