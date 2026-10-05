"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { addToCart } from "@/lib/cart";
import { priceLine, products, type ProductSlug } from "@/lib/catalog";
import { formatPrice, href, type Locale } from "@/lib/i18n";
import type { Dictionary } from "@/dictionaries/en";

export default function AddToCart({ lang, slug, t }: { lang: Locale; slug: ProductSlug; t: Dictionary }) {
  const p = products[slug];
  // Le pack est recommandé par deux (cycle complet de 6 semaines).
  const [qty, setQty] = useState(p.volumeDiscount ? 2 : 1);
  const [added, setAdded] = useState(false);
  const line = priceLine({ slug, qty });

  return (
    <div className="rounded-[2rem] bg-paper p-6 shadow-soft sm:p-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{t.product.total}</p>
          <p className="font-sans text-4xl font-bold">{formatPrice(line.totalCents, lang)}</p>
          {line.discountCents > 0 ? (
            <p className="mt-1 text-sm text-signal">
              <s className="text-muted">{formatPrice(line.unitCents * qty, lang)}</s> · −{p.volumeDiscount?.percent}%
            </p>
          ) : null}
        </div>
        <div className="flex items-center rounded-full border border-ink/15" role="group" aria-label={t.product.quantity}>
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex size-11 items-center justify-center" aria-label="−">
            <Minus className="size-4" />
          </button>
          <span className="w-8 text-center font-semibold tabular-nums" aria-live="polite">
            {qty}
          </span>
          <button type="button" onClick={() => setQty((q) => Math.min(p.maxQty, q + 1))} className="flex size-11 items-center justify-center" aria-label="+">
            <Plus className="size-4" />
          </button>
        </div>
      </div>
      {t.products[slug].qtyNote ? <p className="mt-3 text-sm text-ink-soft">{t.products[slug].qtyNote}</p> : null}
      <button
        type="button"
        onClick={() => {
          addToCart(slug, qty);
          setAdded(true);
        }}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-4 font-medium text-paper transition hover:bg-ink-soft"
      >
        {added ? <Check className="size-5" /> : null}
        {added ? t.common.added : t.common.addToCart}
      </button>
      {added ? (
        <Link href={href(lang, "/cart")} className="mt-3 block text-center text-sm underline underline-offset-4">
          {t.cart.checkout}
        </Link>
      ) : null}
      {p.restricted ? <p className="mt-4 text-xs leading-relaxed text-muted">{t.product.ageNotice}</p> : null}
    </div>
  );
}
