import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import { SITE_URL } from "@/lib/seo";
import { productList } from "@/lib/catalog";
import { getArticles } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths: { path: string; modified?: string }[] = [
    { path: "" },
    { path: "/shop" },
    ...productList.map((p) => ({ path: `/product/${p.slug}` })),
    { path: "/how-it-works" },
    { path: "/learn" },
    ...getArticles().map((a) => ({ path: `/learn/${a.slug}`, modified: a.updated })),
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
