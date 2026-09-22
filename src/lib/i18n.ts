export const locales = ["en", "fr", "de", "nl"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export function hasLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Code BCP 47 pour Intl (prix, dates) et pour l'attribut hreflang. */
export const intlLocale: Record<Locale, string> = {
  en: "en-IE",
  fr: "fr-FR",
  de: "de-DE",
  nl: "nl-NL",
};

export const localeNames: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  de: "Deutsch",
  nl: "Nederlands",
};

/** Préfixe un chemin interne avec la langue : href("fr", "/shop") → "/fr/shop". */
export function href(lang: Locale, path = ""): string {
  const clean = path === "/" ? "" : path;
  return `/${lang}${clean}`;
}

export function formatPrice(cents: number, lang: Locale): string {
  return new Intl.NumberFormat(intlLocale[lang], { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function formatDate(iso: string, lang: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[lang], { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}
