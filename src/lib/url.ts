/**
 * Resolve the public base origin for the application reliably across both
 * local development and production behind reverse proxies (Nginx, PM2, Vercel).
 */
export function getAppOrigin(req: Request): string {
  // 1. Priority: Check reverse proxy headers (e.g. Nginx proxy_pass, Cloudflare, load balancers)
  const forwardedHost = req.headers.get("x-forwarded-host");
  const hostHeader = req.headers.get("host");
  const host = forwardedHost || hostHeader;

  // If incoming request is for an external production domain, use it immediately
  if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
    const forwardedProto = req.headers.get("x-forwarded-proto");
    const proto = forwardedProto || "https";
    return `${proto}://${host}`;
  }

  // 2. Check environment variable if configured with production domain
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl.replace(/\/+$/, "");
  }

  // 3. Fallback for local development
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") || "http";
    return `${proto}://${host}`;
  }

  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }

  const reqUrl = new URL(req.url);
  return `${reqUrl.protocol}//${reqUrl.host}`;
}
