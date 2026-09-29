import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, hasLocale, locales } from "@/lib/i18n";

/**
 * Toute URL sans préfixe de langue est redirigée vers la langue du navigateur
 * (en, fr, de, nl), anglais par défaut — l'ancien site servait l'anglais à la racine.
 *
 * Les anciennes URL WordPress connues sont traitées AVANT, par les redirections 301
 * de next.config.ts : elles ne passent jamais par ici.
 */
function preferredLocale(request: NextRequest): string {
  const header = request.headers.get("accept-language") ?? "";
  for (const part of header.split(",")) {
    const code = part.split(";")[0]?.trim().slice(0, 2).toLowerCase();
    if (code && hasLocale(code)) return code;
  }
  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1] ?? "";
  if ((locales as readonly string[]).includes(first)) return;

  request.nextUrl.pathname = `/${preferredLocale(request)}${pathname === "/" ? "" : pathname}`;
  // 307 : la cible dépend du navigateur, elle ne doit pas être mise en cache comme
  // une redirection permanente.
  return NextResponse.redirect(request.nextUrl, 307);
}

export const config = {
  // `seo` est exclu comme `api` : le tableau de bord « SEO by Clickzou » vit hors
  // du site multilingue, une redirection vers /en/seo le rendrait introuvable.
  matcher: ["/((?!_next|api|seo|images|brand|favicon|robots.txt|sitemap.xml|.*\\..*).*)"],
};
