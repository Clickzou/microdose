"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { defaultLocale, hasLocale, href, type Locale } from "@/lib/i18n";
import type { Dictionary } from "@/dictionaries/en";

export default function NotFoundView({ copies }: { copies: Record<string, Dictionary["notFound"]> }) {
  const seg = usePathname()?.split("/")[1] ?? "";
  const lang: Locale = hasLocale(seg) ? seg : defaultLocale;
  const t = copies[lang];
  return (
    <section className="mx-auto max-w-2xl px-4 py-32 text-center sm:px-6">
      <p className="font-sans text-8xl font-bold text-ink/10">404</p>
      <h1 className="mt-4 text-4xl sm:text-5xl">{t.title}</h1>
      <p className="mt-5 text-lg text-ink-soft">{t.text}</p>
      <Link href={href(lang)} className="mt-10 inline-flex rounded-full bg-ink px-7 py-3.5 font-medium text-paper">
        {t.cta}
      </Link>
    </section>
  );
}
