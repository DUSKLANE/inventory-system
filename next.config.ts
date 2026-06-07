import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.204.117", "10.239.73.117"],
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
