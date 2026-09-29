import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getDictionary } from "@/dictionaries";
import { hasLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/ui";

export async function generateMetadata({ params }: PageProps<"/[lang]/about">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = await getDictionary(lang);
  return pageMetadata({ lang, path: "/about", title: t.seo.about.title, description: t.seo.about.description });
}

export default async function About({ params }: PageProps<"/[lang]/about">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = await getDictionary(lang);
  const a = t.about;
  return (
    <>
      <PageHero a={a.title} b={a.accent} intro={a.intro} />
      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-20">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem]">
          <Image src="/images/group-sofa.webp" alt="" fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
        </div>
        <div className="space-y-6 text-lg leading-relaxed text-ink-soft lg:pt-10">
          {a.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-4xl">{a.valuesTitle}</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {a.values.map((v) => (
            <div key={v.title} className="rounded-[2rem] bg-coffret-soft p-8">
              <h3 className="text-2xl">{v.title}</h3>
              <p className="mt-3 text-ink-soft">{v.text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
