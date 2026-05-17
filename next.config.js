/** @type {import('next').NextConfig} */
const { version } = require("./package.json");
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com https://places.googleapis.com https://ipapi.co https://vitals.vercel-insights.com",
  "frame-src 'self' https://*.google.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspDirectives },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

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
    // AVIF first (25–35% smaller than WebP at equivalent quality, supported by
    // every modern iOS/Android browser); WebP fallback for older clients; the
    // optimizer falls back to JPEG when neither is accepted.
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    // Temporarily disabled — under investigation as a probable iOS Safari
    // memory leak source. View Transition snapshots can retain old DOM
    // bitmaps across navigations on iOS WebKit, causing tab crashes after
    // repeated grid <-> detail navigation. Flip back after confirming.
    viewTransition: false,
    // Rewrite barrel imports into deep imports so the bundler can tree-shake
    // unused exports from these packages. Cuts client bundle size.
    optimizePackageImports: [
      "@supabase/supabase-js",
      "@supabase/ssr",
      "embla-carousel-react",
      "@vis.gl/react-google-maps",
      "@googlemaps/js-api-loader",
      "browser-image-compression",
    ],
  },
  compiler: {
    // Strip console.* from production builds (saves a few KB and avoids leaking
    // dev logs in prod) while keeping error/warn for debuggability.
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);
