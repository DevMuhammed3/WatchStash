import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@watchstash/types", "@watchstash/ui"],
};

export default nextConfig;
