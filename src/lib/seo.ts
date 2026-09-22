import type { Metadata } from "next";
import { locales, type Locale } from "./i18n";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://bien-microdose.com").replace(/\/$/, "");

/**
 * Indexation : uniquement en production, sur le vrai domaine. Les déploiements de
 * prévisualisation Vercel (*.vercel.app) restent en noindex pour ne jamais entrer
 * en concurrence avec le site en ligne.
 */
export function indexingAllowed(): boolean {
  if (process.env.NEXT_PUBLIC_ALLOW_INDEXING === "false") return false;
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return false;
  return !SITE_URL.includes("vercel.app");
}

/** Métadonnées d'une page : canonical, hreflang réciproques, Open Graph. */
export function pageMetadata({
  lang,
  path,
  title,
  description,
  image = "/images/hero-sky.webp",
  type = "website",
}: {
  lang: Locale;
  path: string;
  title: string;
  description: string;
  image?: string;
  type?: "website" | "article";
}): Metadata {
  const languages = Object.fromEntries(locales.map((l) => [l, `${SITE_URL}/${l}${path}`]));
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/${lang}${path}`,
      languages: { ...languages, "x-default": `${SITE_URL}/en${path}` },
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${lang}${path}`,
      siteName: "BIEN Microdose",
      locale: lang,
      type,
      images: [{ url: `${SITE_URL}${image}`, width: 1200, height: 1200 }],
    },
    robots: indexingAllowed() ? { index: true, follow: true } : { index: false, follow: false },
  };
}
