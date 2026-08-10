import dynamic from "next/dynamic";
import { Sidebar } from "@/components/sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { ScanProvider } from "@/components/scan-context";
import { ReactNode } from "react";
import { PageTransition } from "@/components/page-transition";

const FloatingAiChat = dynamic(
  () => import("@/components/floating-ai-chat").then((mod) => mod.FloatingAiChat)
);

const FloatingScanProgress = dynamic(
  () => import("@/components/floating-scan-progress").then((mod) => mod.FloatingScanProgress)
);

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ScanProvider>
      <div className="flex min-h-[100dvh]">
        <Sidebar />
        <div className="flex-1 w-full pb-20 lg:pb-0">
          <PageTransition>{children}</PageTransition>
        </div>
      </div>
      <BottomNav />
      {/* Floating scan progress — visible on ALL pages while scanning */}
      <FloatingScanProgress />
      {/* Floating AI Chatbox — available on all pages */}
      <FloatingAiChat />
    </ScanProvider>
  );
}