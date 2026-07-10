import type { NextConfig } from "next";

/**
 * Security headers applied to every response.
 *
 * La CSP permite conexiones a Supabase (Auth/REST/Realtime) vía connect-src.
 * `script-src` incluye 'unsafe-inline' porque Next.js inyecta scripts inline
 * de bootstrap/hidratación sin nonce en esta configuración; endurecer eso a
 * nonces es un paso posterior. `frame-ancestors 'none'` + X-Frame-Options
 * bloquean el clickjacking (la app no se embebe en ningún iframe).
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_HOST = SUPABASE_URL.replace(/^https?:\/\//, "");

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""),
  `connect-src 'self' ${SUPABASE_URL} wss://${SUPABASE_HOST}`.trim(),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
