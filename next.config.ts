import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.204.117", "10.239.73.117"],
  ...(process.env.DOCKER_BUILD === "1" && { output: "standalone" }),
};

export default nextConfig;
