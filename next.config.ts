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
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts', 'date-fns', 'sonner'],
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
  // THE FIX: Explicitly tells Next.js 16 it is okay to mix Turbopack and Webpack plugins
  turbopack: {},
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