import Link from "next/link";
import Image from "next/image";
import { href, type Locale } from "@/lib/i18n";
import type { Dictionary } from "@/dictionaries/en";
import { CartButton, LanguageSwitch, MobileMenu } from "./header-client";

export default function SiteHeader({ lang, t }: { lang: Locale; t: Dictionary["nav"] }) {
  const links = [
    { href: href(lang, "/shop"), label: t.shop },
    { href: href(lang, "/how-it-works"), label: t.howItWorks },
    { href: href(lang, "/learn"), label: t.learn },
    { href: href(lang, "/about"), label: t.about },
    { href: href(lang, "/faq"), label: t.faq },
    { href: href(lang, "/contact"), label: t.contact },
  ];
  const [before, after] = t.promo.split("{code}");
  return (
    <>
      <p className="bg-ink px-4 py-2 text-center text-sm font-medium text-paper">
        {before}
        <strong className="font-semibold tracking-wide">SHROOM10</strong>
        {after}
      </p>
      <header className="sticky top-0 z-50 border-b border-ink/5 bg-paper/80 backdrop-blur-md">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
          {t.skip}
        </a>
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:h-20">
          <MobileMenu lang={lang} t={t} links={links} />
          <Link href={href(lang)} className="shrink-0" aria-label="BIEN Microdose">
            <Image src="/brand/logo-bien.svg" alt="BIEN" width={488} height={155} priority className="h-7 w-auto lg:h-8" />
          </Link>
          <nav className="ml-8 hidden items-center gap-7 text-[0.95rem] lg:flex" aria-label="Main">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="text-ink-soft transition hover:text-ink">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:block">
              <LanguageSwitch lang={lang} label={t.language} />
            </div>
            <CartButton lang={lang} label={t.cart} />
          </div>
        </div>
      </header>
    </>
  );
}
