import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

// The browser always talks to /api/* on this origin; Next proxies to FastAPI.
// This keeps auth cookies first-party and the backend address server-side only.
const apiOrigin = process.env.API_ORIGIN ?? "https://attendance-backend-hsj6.onrender.com";

// Dev only: let phones/laptops on the same network load the dev server (Next 15 restricts
// cross-origin dev requests). Production is unaffected.
const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i && i.family === "IPv4" && !i.internal)
  .map((i) => i!.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: lanAddresses,
  // Lets verification builds use a separate folder (NEXT_DIST_DIR=.next-build npm run build)
  // so they never overwrite the cache of a running `next dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          // Camera is needed for QR scanning (phase 4); location for optional geofencing.
          { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
