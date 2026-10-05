import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, locales } from "@/lib/i18n";

/**
 * Toute URL sans préfixe de langue est redirigée vers l'anglais, la version originale
 * du site (demande de Carla du 05/10/2026). Les versions fr, de et nl restent
 * accessibles par le sélecteur de langue, mais ne sont plus choisies d'après le
 * navigateur.
 *
 * Les anciennes URL WordPress connues sont traitées AVANT, par les redirections 301
 * de next.config.ts : elles ne passent jamais par ici.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1] ?? "";
  if ((locales as readonly string[]).includes(first)) return;

  request.nextUrl.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
  // 307 : temporaire, la détection de la langue du navigateur pourra revenir quand
  // les traductions seront mises en avant.
  return NextResponse.redirect(request.nextUrl, 307);
}

export const config = {
  // `seo` est exclu comme `api` : le tableau de bord « SEO by Clickzou » vit hors
  // du site multilingue, une redirection vers /en/seo le rendrait introuvable.
  matcher: ["/((?!_next|api|seo|images|brand|favicon|robots.txt|sitemap.xml|.*\\..*).*)"],
};
