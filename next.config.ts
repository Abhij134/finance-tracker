import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  reloadOnOnline: true,
  // Disables the service worker during local development to prevent caching issues
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  serverExternalPackages: ['pdfkit'],
  // THE FIX: Explicitly tells Next.js 16 it is okay to mix Turbopack and Webpack plugins
  turbopack: {},
};

export default withSerwist(nextConfig);