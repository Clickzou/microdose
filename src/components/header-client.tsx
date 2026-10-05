"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ShoppingBag, Menu, X } from "lucide-react";
import { cartCount, useCart } from "@/lib/cart";
import { href, locales, localeNames, type Locale } from "@/lib/i18n";
import type { Dictionary } from "@/dictionaries/en";

export function CartButton({ lang, label }: { lang: Locale; label: string }) {
  const count = cartCount(useCart());
  return (
    <Link href={href(lang, "/cart")} className="relative inline-flex size-11 items-center justify-center rounded-full hover:bg-ink/5" aria-label={`${label} (${count})`}>
      <ShoppingBag className="size-5" strokeWidth={1.75} />
      {count > 0 ? (
        <span className="absolute right-1 top-1 flex min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[0.7rem] font-semibold leading-5 text-paper">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

/** Même page, autre langue : on remplace seulement le premier segment. */
function swapLocale(pathname: string, to: Locale): string {
  const parts = pathname.split("/");
  parts[1] = to;
  return parts.join("/") || `/${to}`;
}

export function LanguageSwitch({ lang, label }: { lang: Locale; label: string }) {
  const pathname = usePathname() ?? `/${lang}`;
  return (
    <nav aria-label={label} className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider">
      {locales.map((l) => (
        <Link
          key={l}
          href={swapLocale(pathname, l)}
          hrefLang={l}
          lang={l}
          title={localeNames[l]}
          aria-current={l === lang ? "true" : undefined}
          className={`rounded-full px-2 py-1 ${l === lang ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"}`}
        >
          {l}
        </Link>
      ))}
    </nav>
  );
}

export function MobileMenu({ lang, t, links }: { lang: Locale; t: Dictionary["nav"]; links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Fermer le menu à chaque navigation.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="inline-flex size-11 items-center justify-center rounded-full hover:bg-ink/5 lg:hidden"
      >
        <Menu className="size-5" strokeWidth={1.75} />
        <span className="sr-only">{t.menu}</span>
      </button>
      {open ? (
        <div id="mobile-menu" className="fixed inset-0 z-[80] flex flex-col bg-coffret p-4 lg:hidden">
          <div className="flex justify-end">
            <button type="button" onClick={() => setOpen(false)} className="inline-flex size-11 items-center justify-center rounded-full bg-paper/60">
              <X className="size-5" />
              <span className="sr-only">{t.close}</span>
            </button>
          </div>
          <nav className="mt-6 flex flex-col gap-1 px-2">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="font-display text-4xl font-medium tracking-tight py-2">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto px-2 pb-4">
            <LanguageSwitch lang={lang} label={t.language} />
          </div>
        </div>
      ) : null}
    </>
  );
}
