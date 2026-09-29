import type { Metadata } from "next";
import { locales, type Locale } from "./i18n";

/**
 * Adresse publique du site. Tant que le domaine n'a pas basculé vers Vercel,
 * NEXT_PUBLIC_SITE_URL n'est pas renseignée : on prend alors l'adresse de production
 * fournie par Vercel (microdose-lyart.vercel.app), sans quoi les aperçus de lien
 * (WhatsApp, réseaux sociaux) iraient chercher leur image sur l'ancien WordPress.
 * Vercel met cette variable à jour d'elle-même quand le domaine est rattaché.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://bien-microdose.com")
).replace(/\/$/, "");

/** Longueur du suffixe « — BIEN Microdose » ajouté par le modèle de titre du layout. */
const TITLE_SUFFIX_LENGTH = " — BIEN Microdose".length;

/** Image d'aperçu par défaut : JPG au format recommandé par les réseaux (1200 × 630). */
const DEFAULT_OG_IMAGE = { url: "/images/og-bien-microdose.jpg", width: 1200, height: 630 };

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
  image,
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
  // Le layout ajoute « — BIEN Microdose » (17 caractères). Au-delà de 60 caractères au
  // total, Google tronque la fin : on garde alors le titre seul, mot-clé intact.
  const fitsWithBrand = title.length + TITLE_SUFFIX_LENGTH <= 60;
  return {
    title: fitsWithBrand ? title : { absolute: title },
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
      // Dimensions déclarées seulement pour l'image par défaut, dont on les connaît.
      images: [image ? { url: `${SITE_URL}${image}` } : { ...DEFAULT_OG_IMAGE, url: `${SITE_URL}${DEFAULT_OG_IMAGE.url}` }],
    },
    robots: indexingAllowed() ? { index: true, follow: true } : { index: false, follow: false },
  };
}
