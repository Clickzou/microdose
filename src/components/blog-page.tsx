import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getDictionary } from "@/dictionaries";
import { hasLocale, href, locales } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { CATEGORIES, getArticles, isCategory, type Category } from "@/lib/content";
import { PageHero } from "@/components/ui";
import BlogListing, { listingPath, pageCount } from "@/components/blog-listing";

/**
 * Pages de liste du blog (tous les articles ou une catégorie, page n). Les quatre
 * routes (`/learn`, `/learn/page/[n]`, `/learn/category/[category]` et sa pagination)
 * ne font qu'appeler ces fonctions.
 */

type Params = { lang: string; category?: string; n?: string };

function parse({ category, n }: Params): { category: Category | null; page: number } | null {
  if (category !== undefined && !isCategory(category)) return null;
  const page = n === undefined ? 1 : Number(n);
  if (!Number.isInteger(page) || page < 1) return null;
  return { category: category ?? null, page };
}

function listFor(category: Category | null) {
  const all = getArticles();
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, all.filter((a) => a.category === c).length])) as Record<Category, number>;
  return { articles: category ? all.filter((a) => a.category === category) : all, counts };
}

export async function blogMetadata(params: Params): Promise<Metadata> {
  const p = parse(params);
  if (!hasLocale(params.lang) || !p) return {};
  const t = await getDictionary(params.lang);
  const base = p.category
    ? { title: t.learn.categoryMeta[p.category].title, description: t.learn.categoryMeta[p.category].description }
    : { title: t.seo.learn.title, description: t.learn.intro };
  // Pages 2+ : titre distinct, canonical sur elles-mêmes (recommandation Google pour la pagination).
  const title = p.page > 1 ? `${base.title}, ${t.learn.page} ${p.page}` : base.title;
  return pageMetadata({ lang: params.lang, path: listingPath(p.category, p.page), title, description: base.description });
}

export async function BlogPage({ params }: { params: Params }) {
  const p = parse(params);
  if (!hasLocale(params.lang) || !p) notFound();
  const lang = params.lang;
  // `/page/1` n'existe pas : la page 1 est l'URL de base.
  if (params.n === "1") redirect(href(lang, listingPath(p.category, 1)));
  const t = await getDictionary(lang);
  const { articles, counts } = listFor(p.category);
  // Catégorie encore sans article publié (ses articles sont programmés) : pas de page vide.
  if (p.category && articles.length === 0) notFound();
  if (p.page > pageCount(articles.length)) notFound();
  const hero = p.category
    ? { a: t.learn.categories[p.category], intro: t.learn.categoryMeta[p.category].description }
    : { a: t.learn.title, b: t.learn.accent, intro: t.learn.intro };

  return (
    <>
      <PageHero kicker={p.category ? t.learn.title : undefined} a={hero.a} b={hero.b} intro={hero.intro} />
      <BlogListing lang={lang} t={t} articles={articles} category={p.category} page={p.page} counts={counts} />
    </>
  );
}

/** Paramètres pré-générés au build ; les pages apparues depuis sont générées à la demande. */
export function blogStaticParams(kind: "all" | "allPaged" | "category" | "categoryPaged") {
  const { counts } = listFor(null);
  const total = getArticles().length;
  return locales.flatMap((lang) => {
    if (kind === "all") return [{ lang }];
    if (kind === "allPaged") return Array.from({ length: pageCount(total) - 1 }, (_, i) => ({ lang, n: String(i + 2) }));
    if (kind === "category") return CATEGORIES.filter((c) => counts[c] > 0).map((category) => ({ lang, category }));
    return CATEGORIES.flatMap((category) =>
      Array.from({ length: pageCount(counts[category]) - 1 }, (_, i) => ({ lang, category, n: String(i + 2) })),
    );
  });
}
