import Link from "next/link";
import Image from "next/image";
import { href, type Locale } from "@/lib/i18n";
import type { Dictionary } from "@/dictionaries/en";
import NewsletterForm from "./newsletter-form";

export default function SiteFooter({ lang, t }: { lang: Locale; t: Dictionary }) {
  const f = t.footer;
  const cols = [
    {
      title: f.shop,
      links: [
        { href: href(lang, "/product/peace-in-the-chaos"), label: t.products["peace-in-the-chaos"].name },
        { href: href(lang, "/product/bien-totebag"), label: t.products["bien-totebag"].name },
        { href: href(lang, "/shop"), label: t.nav.shop },
      ],
    },
    {
      title: f.help,
      links: [
        { href: href(lang, "/how-it-works"), label: t.nav.howItWorks },
        { href: href(lang, "/faq"), label: t.nav.faq },
        { href: href(lang, "/contact"), label: t.nav.contact },
      ],
    },
    {
      title: f.company,
      links: [
        { href: href(lang, "/about"), label: t.nav.about },
        { href: href(lang, "/learn"), label: t.nav.learn },
      ],
    },
    {
      title: f.legal,
      links: [
        { href: href(lang, "/terms"), label: f.terms },
        { href: href(lang, "/privacy"), label: f.privacy },
      ],
    },
  ];

  return (
    <footer className="mt-24 bg-ink text-paper">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <Image src="/brand/logo-bien.svg" alt="BIEN" width={488} height={155} className="h-9 w-auto invert" />
            <p className="mt-5 max-w-xs text-paper/70">{f.tagline}</p>
            <div className="mt-8 max-w-sm">
              <p className="font-display text-xl font-bold">{t.home.newsletterTitle}</p>
              <NewsletterForm lang={lang} t={t.newsletter} dark />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {cols.map((c) => (
              <div key={c.title}>
                <h4 className="text-paper/50">{c.title}</h4>
                <ul className="mt-4 space-y-2.5">
                  {c.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-paper/85 hover:text-paper">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-16 max-w-3xl text-xs leading-relaxed text-paper/55">{f.disclaimer}</p>
        <div className="mt-6 flex flex-col gap-2 border-t border-paper/10 pt-6 text-xs text-paper/50 sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {f.rights}
          </p>
          <p>
            <a href="mailto:info@bien.health" className="hover:text-paper">
              info@bien.health
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
