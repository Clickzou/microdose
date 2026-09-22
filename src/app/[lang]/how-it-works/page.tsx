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
  return pageMetadata({ lang, path: "/how-it-works", title: `${t.howItWorks.title} ${t.howItWorks.accent}`, description: t.howItWorks.intro });
}

const supportImages = ["/images/app.webp", "/images/consultation.webp", "/images/chat.webp", "/images/group-sofa.webp"];

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

      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-4xl">{h.supportTitle}</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {h.support.map((s, i) => (
            <div key={s.title} className="overflow-hidden rounded-[2rem] bg-coffret-soft">
              <div className="relative aspect-[16/10]">
                <Image src={supportImages[i]} alt="" fill sizes="(min-width: 640px) 45vw, 100vw" className="object-cover" />
              </div>
              <div className="p-8">
                <h3 className="text-2xl">{s.title}</h3>
                <p className="mt-2 text-ink-soft">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-10 rounded-[2.5rem] bg-ink p-6 text-paper sm:p-10 lg:grid-cols-[0.7fr_1.3fr] lg:p-16">
          <div className="relative mx-auto aspect-[3/4] w-full max-w-xs overflow-hidden rounded-[2rem]">
            <Image src="/images/dr-garcia.webp" alt={h.doctorTitle} fill sizes="320px" className="object-cover" />
          </div>
          <div>
            <Kicker className="text-paper/60">{h.doctorRole}</Kicker>
            <h2 className="mt-4 text-4xl">{h.doctorTitle}</h2>
            <p className="mt-6 text-lg leading-relaxed text-paper/80">{h.doctorText}</p>
            <div className="mt-8">
              <ButtonLink href={href(lang, "/product/peace-in-the-chaos")} variant="light">
                {t.home.heroCta}
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
