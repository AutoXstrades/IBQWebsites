import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  outputFileTracingIncludes: { "/*": ["./certs/supabase-ca.crt"] },
  experimental: { serverActions: { bodySizeLimit: "64kb" } },
  async headers() { return [{ source: "/:path*", headers: [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "no-referrer" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=(), browsing-topics=()" },
    { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
  ] }]; },
  allowedDevOrigins: ["192.168.12.232"],
};

export default nextConfig;
