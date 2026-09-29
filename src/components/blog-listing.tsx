import Link from "next/link";
import { href, type Locale } from "@/lib/i18n";
import { CATEGORIES, type Article, type Category } from "@/lib/content";
import type { Dictionary } from "@/dictionaries/en";
import { ArticleCard, FeaturedArticle } from "@/components/ui";

/**
 * Liste du blog : onglets de catégories, article mis en avant, grille paginée.
 *
 * Partagée par `/learn`, `/learn/page/[n]` et leurs équivalents par catégorie. Chaque
 * page a sa propre URL (crawlable), la page 1 n'a jamais de suffixe `/page/1`.
 */
export const PAGE_SIZE = 9;

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}

/** Chemin d'une page de liste, sans la langue. */
export function listingPath(category: Category | null, page: number): string {
  const base = category ? `/learn/category/${category}` : "/learn";
  return page > 1 ? `${base}/page/${page}` : base;
}

export default function BlogListing({
  lang,
  t,
  articles,
  category,
  page,
  counts,
}: {
  lang: Locale;
  t: Dictionary;
  /** Articles en ligne de la liste (déjà filtrés par catégorie), le plus récent en premier. */
  articles: Article[];
  category: Category | null;
  page: number;
  /** Nombre d'articles en ligne par catégorie : les onglets vides ne sont pas affichés. */
  counts: Record<Category, number>;
}) {
  const total = pageCount(articles.length);
  const slice = articles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const [featured, ...rest] = page === 1 ? slice : [undefined, ...slice];
  const tab = "whitespace-nowrap rounded-full px-4 py-2 text-sm transition";

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <nav aria-label={t.learn.categoriesLabel} className="-mx-4 overflow-x-auto px-4 pt-10 sm:mx-0 sm:px-0">
        <ul className="flex gap-2">
          <li>
            <Link
              href={href(lang, "/learn")}
              aria-current={category === null ? "page" : undefined}
              className={`${tab} ${category === null ? "bg-ink text-paper" : "border border-ink/15 hover:border-ink"}`}
            >
              {t.learn.all}
            </Link>
          </li>
          {CATEGORIES.filter((c) => counts[c] > 0).map((c) => (
            <li key={c}>
              <Link
                href={href(lang, listingPath(c, 1))}
                aria-current={category === c ? "page" : undefined}
                className={`${tab} ${category === c ? "bg-ink text-paper" : "border border-ink/15 hover:border-ink"}`}
              >
                {t.learn.categories[c]} <span className="opacity-60">{counts[c]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {featured ? (
        <div className="pt-10">
          <FeaturedArticle lang={lang} article={featured} t={t} />
        </div>
      ) : null}

      {rest.length ? (
        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((a) => (a ? <ArticleCard key={a.slug} lang={lang} article={a} t={t} /> : null))}
        </div>
      ) : null}

      {total > 1 ? (
        <nav aria-label={t.learn.pagination} className="mt-16 flex flex-wrap items-center justify-center gap-2">
          {page > 1 ? (
            <Link href={href(lang, listingPath(category, page - 1))} rel="prev" className={`${tab} border border-ink/15 hover:border-ink`}>
              ← {t.learn.previous}
            </Link>
          ) : null}
          {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={href(lang, listingPath(category, n))}
              aria-current={n === page ? "page" : undefined}
              aria-label={`${t.learn.page} ${n}`}
              className={`${tab} min-w-10 text-center ${n === page ? "bg-ink text-paper" : "border border-ink/15 hover:border-ink"}`}
            >
              {n}
            </Link>
          ))}
          {page < total ? (
            <Link href={href(lang, listingPath(category, page + 1))} rel="next" className={`${tab} border border-ink/15 hover:border-ink`}>
              {t.learn.next} →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
