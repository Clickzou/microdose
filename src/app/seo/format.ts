/**
 * Formatage des nombres et des dates du tableau de bord.
 *
 * Module volontairement sans dépendance : il est partagé par les composants
 * serveur (`ui.tsx`, qui lit le catalogue du blog) et par le graphique, qui est
 * un composant client. Si ce dernier importait `ui.tsx` pour trois fonctions de
 * formatage, tout le contenu des articles partirait dans le bundle du
 * navigateur.
 */

const nf = new Intl.NumberFormat("fr-FR");
export const nf1 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function num(value: number): string {
  return nf.format(Math.round(value));
}

export function pct(value: number): string {
  return `${nf1.format(value)} %`;
}

export function money(value: number, currency = "EUR"): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function duration(seconds: number): string {
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m} min ${String(s % 60).padStart(2, "0")} s` : `${s} s`;
}

/** Accepte les deux formats reçus : « 20260829 » (GA4) et « 2026-08-29 » (Search Console). */
function isoOf(date: string): string {
  return date.includes("-") ? date : `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
}

export function shortDate(date: string): string {
  const d = new Date(`${isoOf(date)}T00:00:00Z`);
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", timeZone: "UTC" }).format(d);
}

export function longDate(date: string): string {
  const d = new Date(`${isoOf(date)}T00:00:00Z`);
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
}

/** « samedi 29 août » — l'en-tête de l'infobulle du graphique. */
export function weekdayDate(date: string): string {
  const d = new Date(`${isoOf(date)}T00:00:00Z`);
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "2-digit", month: "long", timeZone: "UTC" }).format(d);
}
