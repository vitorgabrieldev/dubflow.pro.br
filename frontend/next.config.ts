import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  turbopack: {
    root: __dirname,
  },
  images: {
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "https", hostname: "localhost" },
      { protocol: "https", hostname: "startup.dev.br" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "i.pravatar.cc" },
      { protocol: "https", hostname: "samplelib.com" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
