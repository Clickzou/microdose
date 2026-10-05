import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { getDictionary } from "@/dictionaries";
import { formatPrice, hasLocale, locales } from "@/lib/i18n";
import { SITE_URL, pageMetadata } from "@/lib/seo";
import { isProductSlug, productList, products } from "@/lib/catalog";
import { Kicker, ProductCard, TrustBadges } from "@/components/ui";
import AddToCart from "@/components/add-to-cart";
import ProductGallery from "@/components/product-gallery";
import JsonLd from "@/components/json-ld";
import type { Dictionary } from "@/dictionaries/en";

export function generateStaticParams() {
  return locales.flatMap((lang) => productList.map((p) => ({ lang, slug: p.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/product/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang) || !isProductSlug(slug)) return {};
  const t = await getDictionary(lang);
  // PEACE in the Chaos : l'image de partage par défaut est déjà sa boîte, en JPG 1200 × 630.
  const seo = slug === "peace-in-the-chaos" ? t.seo.peace : t.seo.tote;
  const image = slug === "peace-in-the-chaos" ? undefined : products[slug].images[0];
  return pageMetadata({ lang, path: `/product/${slug}`, title: seo.title, description: seo.description, image });
}

export default async function ProductPage({ params }: PageProps<"/[lang]/product/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang) || !isProductSlug(slug)) notFound();
  const t = await getDictionary(lang);
  const p = products[slug];
  const c = t.products[slug];
  const other = productList.filter((x) => x.slug !== slug);

  const details = [
    { title: c.descriptionTitle, body: <p>{c.description}</p> },
    c.howTo.length
      ? {
          title: c.howToTitle,
          body: (
            <ol className="list-decimal space-y-1.5 pl-5">
              {c.howTo.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          ),
        }
      : null,
    { title: c.ingredientsTitle, body: <p>{c.ingredients}</p> },
    { title: c.storageTitle, body: <p>{c.storage}</p> },
    c.warning ? { title: c.warningTitle, body: <p>{c.warning}</p> } : null,
  ].filter((d): d is { title: string; body: React.ReactElement } => Boolean(d));

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: c.name,
          description: c.short,
          sku: p.sku,
          brand: { "@type": "Brand", name: "BIEN" },
          image: p.images.map((i) => `${SITE_URL}${i}`),
          offers: {
            "@type": "Offer",
            price: (p.priceCents / 100).toFixed(2),
            priceCurrency: "EUR",
            availability: "https://schema.org/InStock",
            url: `${SITE_URL}/${lang}/product/${slug}`,
          },
        }}
      />
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-16">
        <ProductGallery images={p.images} alt={c.name} />
        <div className="lg:pt-4">
          <Kicker>{c.tagline}</Kicker>
          <h1 className="mt-3 text-5xl sm:text-6xl">{c.name}</h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-soft">{c.short}</p>
          <p className="mt-4 font-sans text-2xl font-bold">
            {formatPrice(p.priceCents, lang)}
            {p.doses ? (
              <span className="ml-3 font-sans text-base font-normal text-muted">
                {formatPrice(Math.round(p.priceCents / p.doses), lang)} {t.common.perDose}
              </span>
            ) : null}
          </p>

          <ul className="mt-8 space-y-2.5">
            {c.includes.map((item) => (
              <li key={item} className="flex gap-3">
                <Check className="mt-0.5 size-5 shrink-0 text-signal" />
                {item}
              </li>
            ))}
          </ul>

          {slug === "peace-in-the-chaos" ? <TrustBadges labels={t.product.badges} className="mt-8" /> : null}

          <div className="mt-8">
            <AddToCart lang={lang} slug={slug} t={t} />
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
            {t.product.reassurance.map((r) => (
              <li key={r} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-earth" />
                {r}
              </li>
            ))}
          </ul>

          <div className="mt-10 divide-y divide-line border-y border-line">
            {details.map((d, i) => (
              <details key={d.title} open={i === 0} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                  {d.title}
                  <span className="text-xl transition group-open:rotate-45">+</span>
                </summary>
                <div className="mt-3 leading-relaxed text-ink-soft">{d.body}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {slug === "peace-in-the-chaos" ? <PeaceSections t={t.protocol} /> : null}

      {slug === "peace-in-the-chaos" ? (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="text-3xl sm:text-4xl">{t.product.reviewsTitle}</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {t.home.voices.map((v) => (
              <figure key={v.name} className="rounded-[2rem] bg-coffret-soft p-8">
                <blockquote lang="en" className="leading-relaxed">“{v.quote}”</blockquote>
                <figcaption className="mt-6 text-sm font-semibold">{v.name}</figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-6 max-w-3xl text-xs text-muted">{t.home.voicesNote}</p>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-3xl">{t.product.related}</h2>
        <div className="mt-8 grid gap-12 md:grid-cols-2">
          {other.map((o) => (
            <ProductCard key={o.slug} lang={lang} slug={o.slug} t={t} />
          ))}
        </div>
      </section>
    </>
  );
}

/** Rythme d'une semaine du protocole 2-6-2 : prise les jours 1 et 4. */
const WEEK = [true, false, false, true, false, false, false];

/** Visuels d'origine, dans l'ordre de `protocol.benefits` (Calm, Resiliency, Mental Clarity, Creativity). */
const PROTOCOL_BENEFIT_IMAGES = ["/images/benefit-calm.webp", "/images/benefit-resiliency.webp", "/images/benefit-clarity.webp", "/images/benefit-creativity.webp"];

/**
 * Sections de l'ancienne fiche PEACE in the Chaos, remises à la demande de la cliente
 * (05/10/2026), textes mot pour mot : bienfaits, protocole 2-6-2, journée type.
 */
function PeaceSections({ t }: { t: Dictionary["protocol"] }) {
  return (
    <>
      {/* ---------------------------------------------------------- Bienfaits */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="max-w-3xl text-4xl sm:text-5xl">{t.benefitsTitle}</h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">{t.benefitsText}</p>
        <ul className="-mx-4 mt-10 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {t.benefits.map((b, i) => (
            <li key={b.title} className="w-64 shrink-0 snap-start sm:w-auto">
              <div className="relative aspect-square overflow-hidden rounded-[2rem]">
                <Image src={PROTOCOL_BENEFIT_IMAGES[i]} alt="" fill sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 256px" className="object-cover" />
              </div>
              <h3 className="mt-5 text-2xl">{b.title}</h3>
              <p className="mt-2 leading-relaxed text-ink-soft">{b.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------------------------------------------------- Protocole 2-6-2 */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="rounded-[2.5rem] bg-coffret-soft p-6 sm:p-10 lg:p-16">
          <h2 className="max-w-3xl text-4xl sm:text-5xl">{t.fadimanTitle}</h2>
          <p className="mt-4 text-lg text-ink-soft">{t.fadimanText}</p>
          <p className="mt-8 max-w-2xl text-lg font-bold leading-relaxed">
            {t.fadimanRemember}
            <br />
            {t.fadimanRemember2}
          </p>
          <ol className="mt-10 grid grid-cols-7 gap-1.5 sm:gap-3">
            {WEEK.map((dose, i) => (
              <li
                key={i}
                className={`flex flex-col items-center gap-1 rounded-xl px-0.5 py-3 text-center sm:gap-2 sm:rounded-2xl sm:px-1 sm:py-6 ${dose ? "bg-ink text-paper" : "bg-paper/70 text-ink-soft"}`}
              >
                {/* Mobile : le numéro seul, le libellé complet ne tient pas sur 7 colonnes. */}
                <span className="text-sm font-bold sm:hidden">{i + 1}</span>
                <span className="hidden text-xs uppercase tracking-[0.1em] sm:inline">{t.day.replace("{n}", String(i + 1))}</span>
                <span className={`text-[0.6rem] leading-tight sm:text-base ${dose ? "font-bold" : ""}`}>{dose ? t.dose : t.off}</span>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex overflow-hidden rounded-3xl text-center text-xs font-bold leading-tight sm:rounded-full sm:text-sm sm:uppercase sm:tracking-[0.1em]">
            <p className="flex w-3/4 items-center justify-center bg-ink px-2 py-3 text-paper">{t.weeksOn}</p>
            <p className="flex w-1/4 items-center justify-center bg-paper/70 px-2 py-3 text-ink">{t.weeksOff}</p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- Journée type */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div>
            <h2 className="text-4xl sm:text-5xl">{t.dayTitle}</h2>
            <p className="mt-4 text-lg text-ink-soft">{t.dayText}</p>
          </div>
          <ol className="border-l border-ink/15">
            {t.timeline.map((s) => (
              <li key={s.time} className="relative pb-8 pl-8 last:pb-0">
                <span className="absolute -left-[5px] top-1.5 size-2.5 rounded-full bg-ink" />
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-ink-soft">{s.time}</p>
                <h3 className="mt-2 text-2xl">{s.title}</h3>
                <p className="mt-1 leading-relaxed text-ink-soft">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
