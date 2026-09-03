import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: {
    // This allows production builds to complete successfully 
    // even if your project has ESLint parsing errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

