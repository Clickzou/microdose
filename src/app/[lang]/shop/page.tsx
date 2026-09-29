import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@/dictionaries";
import { hasLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { productList } from "@/lib/catalog";
import { PageHero, ProductCard } from "@/components/ui";

export async function generateMetadata({ params }: PageProps<"/[lang]/shop">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = await getDictionary(lang);
  return pageMetadata({ lang, path: "/shop", title: t.seo.shop.title, description: t.seo.shop.description });
}

export default async function Shop({ params }: PageProps<"/[lang]/shop">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = await getDictionary(lang);
  return (
    <>
      <PageHero a={t.shop.title} intro={t.shop.intro} />
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <p className="text-sm text-muted">{t.shop.shippingNote}</p>
        <div className="mt-8 grid gap-12 md:grid-cols-2">
          {productList.map((p) => (
            <ProductCard key={p.slug} lang={lang} slug={p.slug} t={t} />
          ))}
        </div>
      </section>
    </>
  );
}
