import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    allowedDevOrigins: ["http://172.31.98.199:3000", "http://localhost:3000"]
  }
};

export default nextConfig;
