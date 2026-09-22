import "server-only";

/** IP du visiteur derrière le proxy Vercel. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "0.0.0.0";
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Limiteur en mémoire, par IP et par route. Il ne tient que le temps de vie d'une
 * instance serverless : suffisant contre un robot insistant, pas contre une attaque
 * distribuée (pour cela, activer la protection « Attack Challenge » de Vercel).
 */
const hits = new Map<string, number[]>();

export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > max;
}

export function siteOrigin(req: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env && !process.env.VERCEL_ENV?.startsWith("preview")) return env.replace(/\/$/, "");
  return new URL(req.url).origin;
}
