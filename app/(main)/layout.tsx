import { Sidebar } from "@/components/sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { ScanProvider } from "@/components/scan-context";
import { FloatingScanProgress } from "@/components/floating-scan-progress";
import { PageTransition } from "@/components/page-transition";
import { FloatingAiChat } from "@/components/floating-ai-chat";

// Main app layout — includes the sidebar for all dashboard/app routes
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ScanProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-16 lg:pb-0">
          <PageTransition>{children}</PageTransition>
        </div>
      </div>
      <BottomNav />
      <FloatingScanProgress />
      {/* Floating AI Chatbox — available on all pages */}
      <FloatingAiChat />
    </ScanProvider>
  );
}