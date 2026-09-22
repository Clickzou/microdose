import "server-only";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "./en";

const loaders: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./en").then((m) => m.default),
  fr: () => import("./fr").then((m) => m.default),
  de: () => import("./de").then((m) => m.default),
  nl: () => import("./nl").then((m) => m.default),
};

export function getDictionary(lang: Locale): Promise<Dictionary> {
  return loaders[lang]();
}

export type { Dictionary };
