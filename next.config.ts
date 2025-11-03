import type { NextConfig } from "next";

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",

  experimental: {
    appDir: true, // ✅
  },
} as NextConfig;

export default nextConfig;
