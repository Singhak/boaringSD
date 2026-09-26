import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The first-run incident lives on the home page now.
      { source: "/mission", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
