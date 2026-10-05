"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { setQty, useCart } from "@/lib/cart";
import { computeTotals, products } from "@/lib/catalog";
import { formatPrice, href, type Locale } from "@/lib/i18n";
import type { Dictionary } from "@/dictionaries/en";

export default function CartView({ lang, t }: { lang: Locale; t: Dictionary }) {
  const lines = useCart();
  const totals = computeTotals(lines);

  if (totals.lines.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg text-ink-soft">{t.cart.empty}</p>
        <Link href={href(lang, "/shop")} className="mt-6 inline-flex rounded-full bg-ink px-7 py-3.5 font-medium text-paper">
          {t.common.backToShop}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
      <ul className="divide-y divide-line border-y border-line">
        {totals.lines.map((l) => {
          const p = products[l.slug];
          const c = t.products[l.slug];
          return (
            <li key={l.slug} className="flex gap-5 py-6">
              <Link href={href(lang, `/product/${l.slug}`)} className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-coffret-soft sm:size-28">
                <Image src={p.images[0]} alt={c.name} fill sizes="112px" className="object-cover" />
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="font-display text-lg font-medium">{c.name}</p>
                    <p className="text-sm text-muted">{c.tagline}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatPrice(l.totalCents, lang)}</p>
                    {l.discountCents > 0 ? <p className="text-xs text-signal">−{formatPrice(l.discountCents, lang)}</p> : null}
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between pt-4">
                  <div className="flex items-center rounded-full border border-ink/15">
                    <button type="button" onClick={() => setQty(l.slug, l.qty - 1)} className="flex size-9 items-center justify-center" aria-label="−">
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-7 text-center text-sm font-semibold tabular-nums">{l.qty}</span>
                    <button type="button" onClick={() => setQty(l.slug, l.qty + 1)} className="flex size-9 items-center justify-center" aria-label="+">
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <button type="button" onClick={() => setQty(l.slug, 0)} className="text-sm text-muted underline underline-offset-4 hover:text-ink">
                    {t.cart.remove}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <aside className="h-fit rounded-[2rem] bg-coffret-soft p-8">
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt>{t.cart.subtotal}</dt>
            <dd>{formatPrice(totals.subtotalCents + totals.discountCents, lang)}</dd>
          </div>
          {totals.discountCents > 0 ? (
            <div className="flex justify-between text-signal">
              <dt>{t.cart.discount}</dt>
              <dd>−{formatPrice(totals.discountCents, lang)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between text-ink-soft">
            <dt>{t.cart.shipping}</dt>
            <dd>{t.cart.shippingCalc}</dd>
          </div>
          <div className="flex justify-between border-t border-ink/10 pt-4 font-sans text-xl font-bold">
            <dt>{t.cart.total}</dt>
            <dd>{formatPrice(totals.subtotalCents, lang)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-muted">{t.cart.vatIncluded}</p>
        <Link href={href(lang, "/checkout")} className="mt-6 flex w-full justify-center rounded-full bg-ink px-6 py-4 font-medium text-paper hover:bg-ink-soft">
          {t.cart.checkout}
        </Link>
      </aside>
    </div>
  );
}
