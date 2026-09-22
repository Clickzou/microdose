import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatDate, hasLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { getLegal, renderMarkdown } from "@/lib/content";
import { getDictionary } from "@/dictionaries";

type Name = "terms" | "privacy";

export async function legalMetadata(name: Name, lang: string): Promise<Metadata> {
  const page = getLegal(name);
  if (!hasLocale(lang) || !page) return {};
  const c = page.i18n[lang];
  return pageMetadata({ lang, path: `/${name}`, title: c.title, description: c.description });
}

export async function LegalPage({ name, lang }: { name: Name; lang: string }) {
  const page = getLegal(name);
  if (!hasLocale(lang) || !page) notFound();
  const t = await getDictionary(lang);
  const c = page.i18n[lang];
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">{c.title}</h1>
      <p className="mt-4 text-sm text-muted">
        {t.common.updated} {formatDate(page.updated, lang)}
      </p>
      <div className="prose-bm mt-10" dangerouslySetInnerHTML={{ __html: renderMarkdown(c.body) }} />
    </section>
  );
}
