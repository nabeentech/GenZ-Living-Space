/**
 * Resolve the public base origin for the application reliably across both
 * local development and production behind reverse proxies (Nginx, PM2, Vercel).
 */
export function getAppOrigin(req: Request): string {
  // 1. If NEXT_PUBLIC_APP_URL is explicitly configured for a production domain, use it with HTTPS
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    let clean = envUrl.replace(/\/+$/, "");
    if (clean.startsWith("http://")) {
      clean = clean.replace("http://", "https://");
    } else if (!clean.startsWith("https://")) {
      clean = `https://${clean}`;
    }
    return clean;
  }

  // 2. Check reverse proxy headers (e.g. Nginx proxy_pass, Cloudflare, load balancers)
  const forwardedHost = req.headers.get("x-forwarded-host");
  const hostHeader = req.headers.get("host");
  const host = forwardedHost || hostHeader;

  // Any public domain must ALWAYS use HTTPS (Google OAuth strictly requires HTTPS for non-localhost)
  if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
    return `https://${host}`;
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
