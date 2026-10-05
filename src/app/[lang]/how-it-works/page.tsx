import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getDictionary } from "@/dictionaries";
import { hasLocale, href } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { ButtonLink, Kicker, PageHero } from "@/components/ui";

export async function generateMetadata({ params }: PageProps<"/[lang]/how-it-works">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = await getDictionary(lang);
  return pageMetadata({ lang, path: "/how-it-works", title: t.seo.howItWorks.title, description: t.seo.howItWorks.description });
}

export default async function HowItWorks({ params }: PageProps<"/[lang]/how-it-works">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = await getDictionary(lang);
  const h = t.howItWorks;

  return (
    <>
      <PageHero kicker={t.home.stepsKicker} a={h.title} b={h.accent} intro={h.intro} />

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <h2 className="text-4xl">{h.timelineTitle}</h2>
        <ol className="mt-12 grid gap-px overflow-hidden rounded-[2rem] bg-line md:grid-cols-4">
          {h.timeline.map((s) => (
            <li key={s.title} className="bg-paper p-8">
              <Kicker>{s.when}</Kicker>
              <h3 className="mt-4 text-2xl">{s.title}</h3>
              <p className="mt-3 leading-relaxed text-ink-soft">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Accompagnement (hotline, médecin consultant, communauté) retiré le 05/10/2026 :
          seule l'application compagnon reste fournie avec le pack. */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="grid items-center gap-10 overflow-hidden rounded-[2.5rem] bg-coffret-soft lg:grid-cols-2">
          <div className="relative aspect-[16/10] lg:aspect-auto lg:h-full lg:min-h-[24rem]">
            <Image src="/images/app.webp" alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </div>
          <div className="p-8 sm:p-12 lg:pl-0">
            <h2 className="text-4xl">{h.appTitle}</h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-soft">{h.appText}</p>
            <div className="mt-8">
              <ButtonLink href={href(lang, "/product/peace-in-the-chaos")}>{t.home.heroCta}</ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
