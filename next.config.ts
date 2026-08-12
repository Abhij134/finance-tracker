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
  reactCompiler: false,
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['framer-motion', 'recharts', 'date-fns', 'sonner', 'lucide-react'],
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  allowedDevOrigins: ['172.20.10.2', '172.20.10.2:3000', 'localhost', '127.0.0.1'],
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
  },
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/logo.svg',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  serverExternalPackages: ['pdfkit', 'unpdf'],
  // NOTE: turbopack: {} was removed — cannot mix Turbopack config with a Webpack build.
  // The error "(Webpack)" in your UnrecognizedActionError confirms Webpack is the active bundler.
  // Having turbopack: {} alongside webpack: () causes action ID hash mismatches in Next.js 16.
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    if (isServer) {
      config.externals = [
        ...(config.externals ?? []),
        "unpdf",
      ];
    }
    return config;
  },
};

export default withSerwist(nextConfig);