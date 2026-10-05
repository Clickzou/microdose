"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { trackCart } from "@/lib/analytics";
import { computeTotals, enabledCountries, normalizeCoupon } from "@/lib/catalog";
import { formatPrice, href, intlLocale, type Locale } from "@/lib/i18n";
import type { Dictionary } from "@/dictionaries/en";

const input = "w-full rounded-2xl border border-ink/15 bg-white px-4 py-3.5 outline-none transition focus:border-ink";

export default function CheckoutForm({ lang, t }: { lang: Locale; t: Dictionary }) {
  const lines = useCart();
  const c = t.checkout;
  const [country, setCountry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState(false);
  const totals = computeTotals(lines, country || undefined, coupon);

  // Le code est vérifié ici pour l’affichage ; le serveur refait le contrôle complet
  // (code connu, une seule utilisation par adresse e-mail).
  function applyCoupon() {
    const code = normalizeCoupon(couponInput);
    setCoupon(code);
    setCouponError(!code);
  }
  const regionNames = new Intl.DisplayNames([intlLocale[lang]], { type: "region" });
  const countries = enabledCountries()
    .map((code) => ({ code, name: regionNames.of(code) ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (totals.lines.length === 0) {
    return (
      <p className="py-16 text-center text-ink-soft">
        {t.cart.empty}{" "}
        <Link href={href(lang, "/shop")} className="underline underline-offset-4">
          {t.common.backToShop}
        </Link>
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    if (!f.get("age")) return setError(c.errors.age);
    if (!f.get("legal")) return setError(c.errors.legal);
    setSending(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lang,
          lines,
          customer: Object.fromEntries(["email", "phone", "firstName", "lastName", "address1", "address2", "zip", "city", "country"].map((k) => [k, String(f.get(k) ?? "").trim()])),
          ageConfirmed: true,
          legalConfirmed: true,
          newsletter: Boolean(f.get("newsletter")),
          coupon: coupon ?? undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.redirect) {
        trackCart("begin_checkout", lines);
        window.location.href = json.redirect;
        return;
      }
      setError(c.errors[json.error as keyof typeof c.errors] ?? c.errors.server);
    } catch {
      setError(c.errors.server);
    }
    setSending(false);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-10 lg:grid-cols-[1.4fr_1fr]" noValidate={false}>
      <div className="space-y-10">
        <fieldset className="space-y-4">
          <legend className="font-display text-2xl font-medium">{c.contact}</legend>
          <input className={input} name="email" type="email" required autoComplete="email" placeholder={c.email} aria-label={c.email} />
          <input className={input} name="phone" type="tel" autoComplete="tel" placeholder={c.phone} aria-label={c.phone} />
        </fieldset>
        <fieldset className="space-y-4">
          <legend className="font-display text-2xl font-medium">{c.delivery}</legend>
          <select
            className={input}
            name="country"
            required
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            aria-label={c.country}
            autoComplete="country"
          >
            <option value="" disabled>
              {c.chooseCountry}
            </option>
            {countries.map((co) => (
              <option key={co.code} value={co.code}>
                {co.name}
              </option>
            ))}
          </select>
          <div className="grid gap-4 sm:grid-cols-2">
            <input className={input} name="firstName" required autoComplete="given-name" placeholder={c.firstName} aria-label={c.firstName} />
            <input className={input} name="lastName" required autoComplete="family-name" placeholder={c.lastName} aria-label={c.lastName} />
          </div>
          <input className={input} name="address1" required autoComplete="address-line1" placeholder={c.address} aria-label={c.address} />
          <input className={input} name="address2" autoComplete="address-line2" placeholder={c.address2} aria-label={c.address2} />
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            <input className={input} name="zip" required autoComplete="postal-code" placeholder={c.zip} aria-label={c.zip} />
            <input className={input} name="city" required autoComplete="address-level2" placeholder={c.city} aria-label={c.city} />
          </div>
        </fieldset>
        <fieldset className="space-y-4 rounded-[2rem] border border-ink/10 p-6">
          {totals.restricted ? (
            <label className="flex gap-3 text-sm leading-relaxed">
              <input type="checkbox" name="age" required className="mt-1 size-4 shrink-0 accent-ink" />
              <span>{c.ageConfirm}</span>
            </label>
          ) : (
            <input type="hidden" name="age" value="1" />
          )}
          <label className="flex gap-3 text-sm leading-relaxed">
            <input type="checkbox" name="legal" required className="mt-1 size-4 shrink-0 accent-ink" />
            <span>
              {c.legalConfirm}{" "}
              <Link href={href(lang, "/terms")} target="_blank" className="underline underline-offset-2">
                {c.terms}
              </Link>
              .
            </span>
          </label>
          <label className="flex gap-3 text-sm leading-relaxed text-ink-soft">
            <input type="checkbox" name="newsletter" className="mt-1 size-4 shrink-0 accent-ink" />
            <span>{c.newsletterOptIn}</span>
          </label>
        </fieldset>
      </div>

      <aside className="h-fit rounded-[2rem] bg-coffret-soft p-8 lg:sticky lg:top-28">
        <h2 className="text-2xl">{c.summary}</h2>
        <ul className="mt-6 space-y-3">
          {totals.lines.map((l) => (
            <li key={l.slug} className="flex justify-between gap-4">
              <span>
                {t.products[l.slug].name} × {l.qty}
              </span>
              <span>{formatPrice(l.unitCents * l.qty, lang)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 border-t border-ink/10 pt-4">
          {coupon ? (
            <p className="flex items-center justify-between gap-3 text-sm">
              <span>{c.couponApplied.replace("{code}", coupon)}</span>
              <button type="button" onClick={() => setCoupon(null)} className="underline underline-offset-4">
                {c.couponRemove}
              </button>
            </p>
          ) : (
            <div className="flex gap-2">
              <input
                className={`${input} py-2.5`}
                value={couponInput}
                onChange={(e) => {
                  setCouponInput(e.target.value);
                  setCouponError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyCoupon();
                  }
                }}
                placeholder={c.couponLabel}
                aria-label={c.couponLabel}
                autoComplete="off"
              />
              <button type="button" onClick={applyCoupon} disabled={!couponInput.trim()} className="shrink-0 rounded-full border border-ink/20 px-4 text-sm hover:border-ink disabled:opacity-50">
                {c.couponApply}
              </button>
            </div>
          )}
          {couponError ? <p className="mt-2 text-sm">{c.errors.coupon}</p> : null}
        </div>
        <dl className="mt-4 space-y-2 border-t border-ink/10 pt-4">
          {totals.discountCents > 0 ? (
            <div className="flex justify-between text-signal">
              <dt>{t.cart.discount}</dt>
              <dd>−{formatPrice(totals.discountCents, lang)}</dd>
            </div>
          ) : null}
          {totals.couponCode ? (
            <div className="flex justify-between text-signal">
              <dt>{t.cart.coupon.replace("{code}", totals.couponCode)}</dt>
              <dd>−{formatPrice(totals.couponCents, lang)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt>{t.cart.shipping}</dt>
            <dd>
              {totals.shippingCents === null ? "—" : totals.shippingCents === 0 ? t.common.free : formatPrice(totals.shippingCents, lang)}
            </dd>
          </div>
          <div className="flex justify-between pt-2 font-sans text-xl font-bold">
            <dt>{t.cart.total}</dt>
            <dd>{formatPrice(totals.totalCents ?? totals.subtotalCents, lang)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-muted">{t.cart.vatIncluded}</p>
        {error ? (
          <p role="alert" className="mt-5 rounded-2xl bg-blush/60 p-3 text-sm">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={sending} className="mt-6 w-full rounded-full bg-ink px-6 py-4 font-medium text-paper hover:bg-ink-soft disabled:opacity-60">
          {sending ? c.paying : c.pay}
        </button>
        <p className="mt-4 text-center text-xs text-muted">{c.secure}</p>
      </aside>
    </form>
  );
}
