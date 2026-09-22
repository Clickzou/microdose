import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@/dictionaries";
import { hasLocale } from "@/lib/i18n";
import CartView from "@/components/cart-view";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function Cart({ params }: PageProps<"/[lang]/cart">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = await getDictionary(lang);
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <h1 className="text-5xl">{t.cart.title}</h1>
      <div className="mt-10">
        <CartView lang={lang} t={t} />
      </div>
    </section>
  );
}
