import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppThemeProvider } from "../components/theme-provider";
import { Toaster } from "sonner";
import { AmbientBackground } from "@/components/ambient-background";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finance Neo",
  description: "Your intelligent finance companion",
  appleWebApp: {
    capable: true,
    title: "FinanceNeo",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppThemeProvider>
          <AmbientBackground />
          {children}
        </AppThemeProvider>

        {/* Global Toast Notifications */}
        <Toaster position="top-center" richColors theme="dark" />
      </body>
    </html>
  );
}
