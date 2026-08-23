import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

const { combinedEnv } = loadEnvConfig(
  path.resolve(__dirname, "../env_vals"),
  process.env.NODE_ENV !== "production"
);

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_PAYPAL_ENVIRONMENT:
      combinedEnv.NEXT_PUBLIC_PAYPAL_ENVIRONMENT || "sandbox",
    NEXT_PUBLIC_PAYPAL_CLIENT_ID:
      combinedEnv.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
  },
  eslint: {
    // This allows production builds to complete successfully 
    // even if your project has ESLint parsing errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

