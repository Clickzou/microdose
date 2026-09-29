import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { getDictionary } from "@/dictionaries";
import { formatPrice, hasLocale, locales } from "@/lib/i18n";
import { SITE_URL, pageMetadata } from "@/lib/seo";
import { isProductSlug, productList, products } from "@/lib/catalog";
import { Kicker, ProductCard } from "@/components/ui";
import AddToCart from "@/components/add-to-cart";
import ProductGallery from "@/components/product-gallery";
import JsonLd from "@/components/json-ld";

export function generateStaticParams() {
  return locales.flatMap((lang) => productList.map((p) => ({ lang, slug: p.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/product/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang) || !isProductSlug(slug)) return {};
  const t = await getDictionary(lang);
  const c = t.products[slug];
  // PEACE in the Chaos : l'image de partage par défaut est déjà sa boîte, en JPG 1200 × 630.
  const image = slug === "peace-in-the-chaos" ? undefined : products[slug].images[0];
  return pageMetadata({ lang, path: `/product/${slug}`, title: c.name, description: c.short, image });
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
          <p className="mt-4 font-display text-2xl font-bold">
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
