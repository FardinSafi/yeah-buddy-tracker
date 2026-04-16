import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; " +
      "script-src 'self'; style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co;",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
