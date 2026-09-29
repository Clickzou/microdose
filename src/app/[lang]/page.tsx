import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/dictionaries";
import { hasLocale, formatDate, formatPrice, href } from "@/lib/i18n";
import { products } from "@/lib/catalog";
import { getArticles } from "@/lib/content";
import { ArticleCard, ButtonLink, Kicker, Marquee, Title } from "@/components/ui";
import NewsletterForm from "@/components/newsletter-form";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = await getDictionary(lang);
  const h = t.home;
  const peace = products["peace-in-the-chaos"];
  const peaceCopy = t.products["peace-in-the-chaos"];
  const articles = getArticles().slice(0, 3);

  return (
    <>
      {/* ------------------------------------------------------------ Héros */}
      <section className="relative overflow-hidden bg-coffret">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-24 lg:pt-20">
          <div>
            <Kicker className="bm-up">{h.heroKicker}</Kicker>
            <h1 className="bm-up mt-5 text-[clamp(3.25rem,9vw,7.5rem)] leading-[0.92]">
              {h.heroTitleA}
              <br />
              <span className="accent">{h.heroTitleB}</span>
            </h1>
            <p className="bm-up bm-up-2 mt-7 max-w-xl text-lg leading-relaxed text-ink-soft">{h.heroText}</p>
            <div className="bm-up bm-up-3 mt-9 flex flex-wrap gap-3">
              <ButtonLink href={href(lang, "/product/peace-in-the-chaos")}>{h.heroCta}</ButtonLink>
              <ButtonLink href={href(lang, "/how-it-works")} variant="ghost">
                {h.heroCta2}
              </ButtonLink>
            </div>
            <p className="bm-up bm-up-3 mt-6 text-xs text-ink-soft">{t.common.adultsOnly}</p>
          </div>
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] shadow-soft">
              <Image src="/images/hero-sky.webp" alt="" fill priority sizes="(min-width: 1024px) 45vw, 90vw" className="object-cover" />
            </div>
            <div className="absolute -bottom-6 -left-4 w-40 overflow-hidden rounded-3xl bg-paper p-2 shadow-soft sm:-left-10 sm:w-52">
              <div className="relative aspect-square overflow-hidden rounded-2xl">
                <Image src="/images/box-open.webp" alt={peaceCopy.name} fill sizes="208px" className="object-cover" />
              </div>
              <p className="px-2 pb-1 pt-2 text-sm font-semibold">{peaceCopy.name}</p>
            </div>
          </div>
        </div>
      </section>

      <Marquee items={t.marquee} />

      {/* ------------------------------------------------------------ Intro */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <Title a={h.introTitle} b={h.introAccent} className="text-4xl sm:text-5xl lg:text-6xl" />
          <div className="space-y-5 text-lg leading-relaxed text-ink-soft lg:pt-3">
            <p>{h.introText}</p>
            <p>{h.introText2}</p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Produit */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid overflow-hidden rounded-[2.5rem] bg-ink text-paper lg:grid-cols-2">
          <div className="relative min-h-[22rem] lg:min-h-[36rem]">
            <Image src="/images/hand-truffles.webp" alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </div>
          <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
            <Kicker className="text-paper/60">{h.productKicker}</Kicker>
            <h2 className="mt-4 text-4xl sm:text-5xl">{peaceCopy.name}</h2>
            <p className="mt-2 text-paper/70">{peaceCopy.tagline}</p>
            <div className="mt-8 flex items-baseline gap-4">
              <p className="font-display text-4xl font-bold">{formatPrice(peace.priceCents, lang)}</p>
              <p className="text-paper/60">
                {formatPrice(Math.round(peace.priceCents / (peace.doses ?? 1)), lang)} {t.common.perDose}
              </p>
            </div>
            <p className="mt-8 font-semibold">{h.productIncludesTitle}</p>
            <ul className="mt-3 space-y-2 text-paper/80">
              {peaceCopy.includes.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-blush" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-paper/60">{h.productRecommend}</p>
            <div className="mt-8">
              <ButtonLink href={href(lang, "/product/peace-in-the-chaos")} variant="light">
                {h.heroCta}
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Méthode */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:py-32">
        <Kicker>{h.stepsKicker}</Kicker>
        <Title a={h.stepsTitle} b={h.stepsAccent} className="mt-4 text-4xl sm:text-5xl lg:text-6xl" />
        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {h.steps.map((s, i) => (
            <li key={s.title} className="rounded-[2rem] bg-coffret-soft p-8">
              <span className="font-display text-6xl font-extrabold text-ink/15">0{i + 1}</span>
              <h3 className="mt-6 text-2xl">{s.title}</h3>
              <p className="mt-3 leading-relaxed text-ink-soft">{s.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10">
          <ButtonLink href={href(lang, "/how-it-works")} variant="ghost">
            {t.common.learnMore}
          </ButtonLink>
        </div>
      </section>

      {/* ------------------------------------------------------------ Qualité */}
      <section className="bg-coffret">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:items-center lg:py-32">
          <div className="relative aspect-square overflow-hidden rounded-[2.5rem]">
            <Image src="/images/truffles-grid.webp" alt="" fill sizes="(min-width: 1024px) 40vw, 90vw" className="object-cover" />
          </div>
          <div>
            <Kicker>{h.qualityKicker}</Kicker>
            <Title a={h.qualityTitle} b={h.qualityAccent} className="mt-4 text-4xl sm:text-5xl" />
            <dl className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2">
              {h.quality.map((q) => (
                <div key={q.title} className="border-t border-ink/15 pt-5">
                  <dt className="font-display text-xl font-bold">{q.title}</dt>
                  <dd className="mt-2 text-ink-soft">{q.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Témoignages */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:py-32">
        <Kicker>{h.voicesKicker}</Kicker>
        <h2 className="mt-4 text-4xl sm:text-5xl">{h.voicesTitle}</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {h.voices.map((v) => (
            <figure key={v.name} className="flex flex-col justify-between rounded-[2rem] border border-line bg-white/60 p-8">
              <blockquote lang="en" className="text-lg leading-relaxed">
                “{v.quote}”
              </blockquote>
              <figcaption className="mt-8 text-sm text-muted">
                <span className="font-semibold text-ink">{v.name}</span> · {formatDate(v.date, lang)}
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-6 max-w-3xl text-xs text-muted">{h.voicesNote}</p>
      </section>

      {/* ------------------------------------------------------------ Accompagnement */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-center gap-10 rounded-[2.5rem] bg-coffret-soft p-6 sm:p-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:p-16">
          <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-[2rem]">
            <Image src="/images/dr-garcia.webp" alt="Dr. David Garcia Padron" fill sizes="(min-width: 1024px) 30vw, 80vw" className="object-cover" />
          </div>
          <div>
            <Kicker>{h.expertKicker}</Kicker>
            <h2 className="mt-4 text-4xl sm:text-5xl">{h.expertTitle}</h2>
            <p className="mt-6 text-lg leading-relaxed text-ink-soft">{h.expertText}</p>
            <div className="mt-8">
              <ButtonLink href={href(lang, "/how-it-works")}>{h.expertCta}</ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Blog */}
      {articles.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:py-32">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <Kicker>{h.learnKicker}</Kicker>
              <h2 className="mt-4 text-4xl sm:text-5xl">{h.learnTitle}</h2>
            </div>
            <ButtonLink href={href(lang, "/learn")} variant="ghost">
              {h.learnCta}
            </ButtonLink>
          </div>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {articles.map((a) => (
              <ArticleCard key={a.slug} lang={lang} article={a} t={t} />
            ))}
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------ Sécurité */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="rounded-[2.5rem] border border-ink/10 p-8 sm:p-12 lg:flex lg:items-start lg:gap-16">
          <h2 className="text-3xl sm:text-4xl lg:w-2/5">{h.safetyTitle}</h2>
          <div className="mt-6 lg:mt-0 lg:w-3/5">
            <p className="leading-relaxed text-ink-soft">{h.safetyText}</p>
            <Link href={href(lang, "/faq")} className="mt-5 inline-block font-medium underline underline-offset-4">
              {h.safetyCta}
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Newsletter */}
      <section className="mx-auto max-w-3xl px-4 pt-24 text-center sm:px-6">
        <h2 className="text-4xl sm:text-5xl">{h.newsletterTitle}</h2>
        <p className="mt-4 text-lg text-ink-soft">{h.newsletterText}</p>
        <div className="mx-auto max-w-md text-left">
          <NewsletterForm lang={lang} t={t.newsletter} />
        </div>
      </section>

      {/* ------------------------------------------------------------ Vidéos clients */}
      {/* Reprise de l'ancien site. Vidéos recompressées (540 × 960, ~2 Mo) et servies
          par le site : rien ne se charge avant le clic sur lecture (preload="none"),
          seule l'image d'aperçu est téléchargée. */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:py-32">
        <h2 className="text-center text-4xl sm:text-5xl">{h.videosTitle}</h2>
        <div className="mt-12 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <video
              key={n}
              src={`/videos/shroomies-${n}.mp4`}
              poster={`/images/shroomies-${n}.webp`}
              controls
              playsInline
              preload="none"
              aria-label={h.videosLabel.replace("{n}", String(n))}
              className="aspect-[9/16] w-full rounded-[2rem] bg-ink object-cover"
            />
          ))}
        </div>
        <div className="mt-10 text-center">
          <a
            href="https://www.instagram.com/bien.health/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full bg-ink px-7 py-3.5 font-medium text-paper transition hover:bg-ink-soft"
          >
            {h.videosCta}
          </a>
        </div>
        <p className="mx-auto mt-6 max-w-3xl text-center text-xs text-muted">{h.videosNote}</p>
      </section>
    </>
  );
}
