import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import { SITE_URL } from "@/lib/seo";
import { productList } from "@/lib/catalog";
import { CATEGORIES, getArticles } from "@/lib/content";

// Régénérée toutes les heures : les articles programmés (publishAt) y apparaissent
// le jour de leur parution, sans redéploiement.
export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = getArticles();
  const paths: { path: string; modified?: string }[] = [
    { path: "" },
    { path: "/shop" },
    ...productList.map((p) => ({ path: `/product/${p.slug}` })),
    { path: "/how-it-works" },
    { path: "/learn" },
    // Pages de catégorie (pas les pages 2+ de pagination, découvertes par les liens).
    ...CATEGORIES.filter((c) => articles.some((a) => a.category === c)).map((c) => ({ path: `/learn/category/${c}` })),
    ...articles.map((a) => ({ path: `/learn/${a.slug}`, modified: a.updated > (a.publishAt ?? a.date) ? a.updated : (a.publishAt ?? a.date) })),
    { path: "/about" },
    { path: "/faq" },
    { path: "/contact" },
    { path: "/terms" },
    { path: "/privacy" },
  ];
  return paths.flatMap(({ path, modified }) =>
    locales.map((lang) => ({
      url: `${SITE_URL}/${lang}${path}`,
      lastModified: modified ? new Date(modified) : undefined,
      alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${SITE_URL}/${l}${path}`])) },
    })),
  );
}
