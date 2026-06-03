import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ["192.168.204.117", "10.239.73.117"],
};

export default nextConfig;
