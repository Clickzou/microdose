"use client";

import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n";

/** Mention de l'agence, affichée dans le pied de page de l'accueil uniquement. */
const TEXT: Record<Locale, string> = {
  fr: "Refonte site internet par",
  en: "Website redesign by",
  de: "Website-Relaunch von",
  nl: "Website vernieuwd door",
};

export default function HomeCredit({ lang }: { lang: Locale }) {
  const pathname = usePathname();
  if (pathname !== `/${lang}`) return null;
  return (
    <p>
      {TEXT[lang]}{" "}
      <a href="https://clickzou.fr/" className="underline underline-offset-2 hover:text-paper">
        Clickzou
      </a>
    </p>
  );
}
