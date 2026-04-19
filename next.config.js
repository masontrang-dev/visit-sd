/** @type {import('next').NextConfig} */
const { version } = require("./package.json");

const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  experimental: {
    viewTransition: true,
  },
};

module.exports = nextConfig;
