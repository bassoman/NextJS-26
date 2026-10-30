import type { NextConfig } from "next";

// NEXT_BASE_PATH lets the same codebase be served under a sub-path prefix
// (e.g. "/carc" on a demo domain) without touching prod (empty/undefined = root).
// It is a build-time setting: the Docker image must be rebuilt per target path.
const nextConfig: NextConfig = {
  output: "standalone",
  basePath: process.env.NEXT_BASE_PATH || undefined,
  eslint: {
    // This allows production builds to complete successfully 
    // even if your project has ESLint parsing errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

