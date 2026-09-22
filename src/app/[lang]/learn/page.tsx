import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@/dictionaries";
import { hasLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { getArticles } from "@/lib/content";
import { ArticleCard, PageHero } from "@/components/ui";

export async function generateMetadata({ params }: PageProps<"/[lang]/learn">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = await getDictionary(lang);
  return pageMetadata({ lang, path: "/learn", title: `${t.learn.title} ${t.learn.accent}`, description: t.learn.intro });
}

export default async function Learn({ params }: PageProps<"/[lang]/learn">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = await getDictionary(lang);
  const articles = getArticles();
  const cats = (Object.keys(t.learn.categories) as (keyof typeof t.learn.categories)[]).filter((c) => articles.some((a) => a.category === c));

  return (
    <>
      <PageHero a={t.learn.title} b={t.learn.accent} intro={t.learn.intro} />
      {cats.map((cat) => (
        <section key={cat} className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
          <h2 className="text-3xl">{t.learn.categories[cat]}</h2>
          <div className="mt-8 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {articles
              .filter((a) => a.category === cat)
              .map((a) => (
                <ArticleCard key={a.slug} lang={lang} article={a} t={t} />
              ))}
          </div>
        </section>
      ))}
    </>
  );
}
