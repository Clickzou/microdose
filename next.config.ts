import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";

/** Slugs des articles : ils gardent leur slug d'origine, seul le préfixe /learn/ change. */
const articleSlugs = fs
  .readdirSync(path.join(process.cwd(), "src/content/blog"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""));

/**
 * Anciennes pages WordPress → nouvelle arborescence. Inventaire du 18/09/2026
 * (V2ismicrodose/data/inventaire-urls.csv, 301 URL connues). Les pages retirées
 * (affiliation, concours, tests TDAH, liste d'attente) renvoient vers l'accueil.
 */
const pageMap: Record<string, string> = {
  "behind-bien": "/about",
  "press-bien-health": "/about",
  "empty-cart": "/cart",
  "microdosing-frequently-asked-questions": "/faq",
  "shop-all-bien-health-products": "/shop",
  "privacy-policy": "/privacy",
  "terms-and-conditions-bien-health": "/terms",
  "online-consultation": "/how-it-works",
  "microdosing-online-consultation": "/how-it-works",
  "is-microdosing-good-for-you-benefits-considerations": "/how-it-works",
  "media-event-inquiries": "/contact",
  "my-account": "",
  "affiliation-dashboard": "",
  "affiliation-registration-form": "",
  giveaway: "",
  "susbcription-waitlist": "",
  "adhd-test-en": "",
  "tdah-test-fr": "",
  "21285-2": "",
};

function legacyRedirects() {
  const out: { source: string; destination: string; permanent: true }[] = [];
  const both = (from: string, to: string) => {
    // Racine = anciennes URL anglaises ; /fr|de|nl = versions Weglot.
    out.push({ source: from, destination: `/en${to}`, permanent: true });
    out.push({ source: `/:lang(fr|de|nl)${from}`, destination: `/:lang${to}`, permanent: true });
  };
  for (const slug of articleSlugs) both(`/${slug}`, `/learn/${slug}`);
  for (const [from, to] of Object.entries(pageMap)) both(`/${from}`, to);
  both("/learn/:page(\\d+)", "/learn");
  both("/category/:path*", "/learn");
  both("/tag/:path*", "/learn");
  both("/author/:path*", "/learn");
  both("/:y(\\d{4})/:m(\\d{2})/:d(\\d{2})", "/learn");
  both("/product-category/:path*", "/shop");
  both("/product-tag/:path*", "/shop");
  // Les fiches produit anglaises étaient à la racine ; les versions traduites ont
  // déjà l'adresse du nouveau site (/fr/product/…).
  out.push({ source: "/product/:slug", destination: "/en/product/:slug", permanent: true });
  out.push({ source: "/cart", destination: "/en/cart", permanent: true });
  out.push({ source: "/shop", destination: "/en/shop", permanent: true });
  return out;
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
  async redirects() {
    return legacyRedirects();
  },
  /**
   * En-têtes de sécurité (audit, constat 12 : aucun n'était envoyé).
   * CSP calibrée sur ce que le site charge : ses propres fichiers, et Google
   * Analytics uniquement après consentement. Les paiements se font par redirection
   * vers CardGate (navigation, pas de formulaire posté ni d'iframe).
   */
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://vercel.live",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "img-src 'self' data: blob: https://www.googletagmanager.com https://*.google-analytics.com",
      "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://vercel.live",
      "frame-src https://vercel.live",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
        ],
      },
    ];
  },
};

export default nextConfig;
