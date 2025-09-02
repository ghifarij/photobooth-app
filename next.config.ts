import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Disable Next.js image optimization; all images are local/static.
    unoptimized: true,
  },
};

export default nextConfig;
