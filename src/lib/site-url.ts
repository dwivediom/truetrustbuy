/**
 * Single source of truth for canonical URLs, OG URLs, sitemap, robots, JSON-LD, and absolute links.
 *
 * Set `NEXT_PUBLIC_SITE_URL` in production (e.g. https://www.truetrustbuy.in) so canonicals match the live host.
 */
export function getPublicSiteOrigin(): string {
  const explicit =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    process.env.AUTH_URL?.trim();
  if (explicit) {
    try {
      const u = new URL(explicit);
      return `${u.protocol}//${u.host}`;
    } catch {
      /* fall through */
    }
  }
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }
  return "https://truetrustbuy.com";
}

/** Absolute URL for a path starting with `/`. */
export function absoluteUrl(path: string): string {
  const base = getPublicSiteOrigin();
  const p = path.startsWith("/") ? path : `/${path}`;
  return new URL(p, base).toString();
}
