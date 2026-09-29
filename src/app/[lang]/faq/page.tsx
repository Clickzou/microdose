import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@/dictionaries";
import { hasLocale, href } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { ButtonLink, PageHero } from "@/components/ui";
import JsonLd from "@/components/json-ld";

export async function generateMetadata({ params }: PageProps<"/[lang]/faq">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = await getDictionary(lang);
  return pageMetadata({ lang, path: "/faq", title: t.seo.faq.title, description: t.seo.faq.description });
}

export default async function Faq({ params }: PageProps<"/[lang]/faq">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = await getDictionary(lang);
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: t.faq.items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
        }}
      />
      <PageHero a={t.faq.title} b={t.faq.accent} intro={t.faq.intro} />
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="divide-y divide-line border-y border-line">
          {t.faq.items.map((i) => (
            <details key={i.q} className="group py-6">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 font-display text-xl font-bold">
                {i.q}
                <span className="mt-0.5 text-2xl font-normal transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-4 leading-relaxed text-ink-soft">{i.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-12">
          <ButtonLink href={href(lang, "/contact")}>{t.nav.contact}</ButtonLink>
        </div>
      </section>
    </>
  );
}
