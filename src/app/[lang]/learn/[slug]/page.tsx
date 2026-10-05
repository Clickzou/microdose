import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDictionary } from "@/dictionaries";
import { formatDate, hasLocale, href, locales } from "@/lib/i18n";
import { SITE_URL, pageMetadata } from "@/lib/seo";
import { NO_CTA_CATEGORIES, getArticle, getArticles, renderMarkdown } from "@/lib/content";
import { ArticleCard, ButtonLink, Kicker } from "@/components/ui";
import JsonLd from "@/components/json-ld";

// Régénérée toutes les heures : les articles programmés (publishAt) y apparaissent
// le jour de leur parution, sans redéploiement.
export const revalidate = 3600;

export function generateStaticParams() {
  return locales.flatMap((lang) => getArticles().map((a) => ({ lang, slug: a.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/learn/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const article = getArticle(slug);
  if (!hasLocale(lang) || !article) return {};
  const a = article.i18n[lang];
  return pageMetadata({ lang, path: `/learn/${slug}`, title: a.title, description: a.description, image: article.image, type: "article" });
}

export default async function ArticlePage({ params }: PageProps<"/[lang]/learn/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const article = getArticle(slug);
  // Article existant mais retenu en relecture juridique : on renvoie vers le blog
  // plutôt qu'un 404, l'URL ayant un historique de référencement.
  if (!article) {
    if (slug.length < 120 && /^[a-z0-9-]+$/.test(slug)) redirect(href(lang, "/learn"));
    notFound();
  }
  const t = await getDictionary(lang);
  const a = article.i18n[lang];
  const related = getArticles()
    .filter((x) => x.slug !== slug && x.category === article.category)
    .concat(getArticles().filter((x) => x.slug !== slug && x.category !== article.category))
    .slice(0, 3);
  // Pas d'appel à l'achat à côté d'un article qui traite d'un sujet de santé : le
  // rapprochement suffirait à constituer une allégation (règlement 1924/2006).
  const showCta = article.compliance.status === "ok" && !NO_CTA_CATEGORIES.includes(article.category) && !article.compliance.noCta;
  const published = article.publishAt ?? article.date;
  const modified = article.updated > published ? article.updated : published;
  const crumbs = [
    { name: t.nav.learn, path: "/learn" },
    { name: t.learn.categories[article.category], path: `/learn/category/${article.category}` },
    { name: a.title, path: `/learn/${slug}` },
  ];

  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: a.title,
          description: a.description,
          image: `${SITE_URL}${article.image}`,
          datePublished: published,
          dateModified: modified,
          inLanguage: lang,
          publisher: { "@type": "Organization", name: "BIEN Microdose" },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: `${SITE_URL}/${lang}${c.path}` })),
        }}
      />
      <header className="bg-coffret-soft">
        <div className="mx-auto max-w-3xl px-4 pb-12 pt-14 sm:px-6">
          {/* Fil d’Ariane : Blog › catégorie › article (doublé en JSON-LD BreadcrumbList). */}
          <nav aria-label="Breadcrumb" className="text-sm text-ink-soft">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {crumbs.slice(0, 2).map((c) => (
                <li key={c.path} className="flex items-center gap-2">
                  <Link href={href(lang, c.path)} className="underline underline-offset-4 hover:text-ink">
                    {c.name}
                  </Link>
                  <span aria-hidden>›</span>
                </li>
              ))}
              <li aria-current="page" className="line-clamp-1 text-muted">
                {a.title}
              </li>
            </ol>
          </nav>
          <Kicker className="mt-8">
            {t.learn.categories[article.category]} · {article.readingMinutes} {t.common.minutes}
          </Kicker>
          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl">{a.title}</h1>
          <p className="mt-5 text-lg text-ink-soft">{a.excerpt}</p>
          <p className="mt-5 text-sm text-muted">
            {t.common.updated} {formatDate(modified, lang)}
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="relative -mt-2 aspect-[16/9] overflow-hidden rounded-[2rem]">
          <Image src={article.image} alt={a.title} fill loading="eager" fetchPriority="high" sizes="(min-width: 1024px) 56rem, 100vw" className="object-cover" />
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <div className="prose-bm" dangerouslySetInnerHTML={{ __html: renderMarkdown(a.body, lang) }} />
        <p className="mt-10 text-sm text-muted">{t.learn.disclaimer}</p>
        {showCta ? (
          <div className="mt-12 rounded-[2rem] bg-ink p-8 text-paper sm:flex sm:items-center sm:justify-between sm:gap-8">
            <p className="font-display text-2xl font-medium">{t.home.stepsTitle} <span className="accent">{t.home.stepsAccent}</span></p>
            <div className="mt-5 shrink-0 sm:mt-0">
              <ButtonLink href={href(lang, "/how-it-works")} variant="light">
                {t.nav.howItWorks}
              </ButtonLink>
            </div>
          </div>
        ) : null}
      </div>
      {related.length ? (
        <section className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-3xl">{t.home.learnTitle}</h2>
          <div className="mt-8 grid gap-10 md:grid-cols-3">
            {related.map((r) => (
              <ArticleCard key={r.slug} lang={lang} article={r} t={t} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
