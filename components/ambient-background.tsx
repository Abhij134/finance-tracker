export function AmbientBackground() {
    return (
        <>
            {/* Emerald glow — top-left */}
            <div
                className="fixed pointer-events-none z-[-1]"
                style={{
                    top: "-10%", left: "-5%",
                    width: "70%", height: "70%",
                    borderRadius: "50%",
                    background: "radial-gradient(circle at center, rgba(16,185,129,0.35) 0%, transparent 65%)",
                    filter: "blur(60px)",
                }}
            />
            {/* Indigo glow — bottom-right */}
            <div
                className="fixed pointer-events-none z-[-1]"
                style={{
                    bottom: "-10%", right: "-5%",
                    width: "75%", height: "75%",
                    borderRadius: "50%",
                    background: "radial-gradient(circle at center, rgba(99,102,241,0.28) 0%, transparent 65%)",
                    filter: "blur(70px)",
                }}
            />
            {/* Cyan mid accent */}
            <div
                className="fixed pointer-events-none z-[-1]"
                style={{
                    top: "30%", left: "40%",
                    width: "55%", height: "55%",
                    borderRadius: "50%",
                    background: "radial-gradient(circle at center, rgba(6,182,212,0.12) 0%, transparent 65%)",
                    filter: "blur(50px)",
                }}
            />
            {/* Violet glow — bottom-left */}
            <div
                className="fixed pointer-events-none z-[-1]"
                style={{
                    bottom: "0%", left: "-5%",
                    width: "50%", height: "50%",
                    borderRadius: "50%",
                    background: "radial-gradient(circle at center, rgba(139,92,246,0.16) 0%, transparent 65%)",
                    filter: "blur(45px)",
                }}
            />
            {/* Dot-grid overlay */}
            <div
                className="fixed inset-0 pointer-events-none z-[-1] opacity-20"
                style={{
                    backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                }}
            />
        </>
    );
}

