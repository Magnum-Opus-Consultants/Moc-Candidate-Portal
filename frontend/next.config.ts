import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Set by `next upgrade --agent=security` when moving off 16.4.0, which
   * carried a published advisory. It records that security upgrades here
   * are applied by an agent, so the toolbar stops prompting for one that
   * has already been done.
   */
  experimental: { agentUpgrade: "security" },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
