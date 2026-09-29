/**
 * Périodes du tableau de bord et période de comparaison associée.
 *
 * Toutes les dates sont calculées en Europe/Paris — le serveur Vercel est en
 * UTC, et sans ce recalage le « 7 derniers jours » sautait un jour entre 00h et
 * 02h. Les API Google attendent des dates au format YYYY-MM-DD.
 *
 * La veille sert de dernier jour : GA4 et Search Console ne consolident pas la
 * journée en cours (Search Console a même deux à trois jours de retard), un
 * dashboard qui l'inclut affiche une chute de trafic qui n'existe pas.
 *
 * Deux façons de choisir la période : un raccourci (`?period=28d`) ou deux
 * dates saisies à la main (`?start=2026-08-01&end=2026-08-15`). La seconde
 * permet d'isoler une journée, une opération commerciale ou un mois clos, et
 * de revenir en arrière — ce que les raccourcis glissants ne savent pas faire.
 */
export const PERIODS = {
  "7d": { days: 7, label: "7 jours" },
  "28d": { days: 28, label: "28 jours" },
  "90d": { days: 90, label: "3 mois" },
  "365d": { days: 365, label: "12 mois" },
} as const;

export type PeriodKey = keyof typeof PERIODS;
export const DEFAULT_PERIOD: PeriodKey = "28d";

/**
 * Première date sélectionnable. Rien n'a été mesuré avant, et une borne basse
 * évite qu'une saisie fautive (« 0202-08-01 », vite tapé dans un champ date)
 * parte demander douze siècles de données à Google.
 */
export const MIN_DAY = "2024-01-01";

export function isPeriodKey(v: string | undefined): v is PeriodKey {
  return !!v && v in PERIODS;
}

export type Range = { start: string; end: string };
export type Period = {
  /** `"custom"` quand la période vient de deux dates saisies. */
  key: PeriodKey | "custom";
  label: string;
  days: number;
  current: Range;
  /** Même durée, juste avant : la base des « +12 % » affichés sur les cartes. */
  previous: Range;
};

function parisToday(): Date {
  const now = new Date();
  // `sv-SE` donne directement YYYY-MM-DD, ce qui évite un formatage manuel.
  const iso = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(now);
  return new Date(`${iso}T00:00:00Z`);
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function shift(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

/** Dernier jour sélectionnable : hier, pour la raison dite en tête de fichier. */
export function parisYesterday(): string {
  return iso(shift(parisToday(), -1));
}

/** Jour au format `YYYY-MM-DD` et réellement existant — `2026-02-31` est rejeté. */
function isDay(v: string | undefined): v is string {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const time = Date.parse(`${v}T00:00:00Z`);
  // Le 31 février se normalise en 3 mars : on le repère à l'aller-retour.
  return !Number.isNaN(time) && iso(new Date(time)) === v;
}

/** Nombre de jours d'un intervalle, bornes comprises. */
function daysBetween(start: string, end: string): number {
  const ms = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}

export function resolvePeriod(key: PeriodKey): Period {
  const { days, label } = PERIODS[key];
  const end = shift(parisToday(), -1); // hier
  const start = shift(end, -(days - 1));
  const prevEnd = shift(start, -1);
  const prevStart = shift(prevEnd, -(days - 1));

  return {
    key,
    label,
    days,
    current: { start: iso(start), end: iso(end) },
    previous: { start: iso(prevStart), end: iso(prevEnd) },
  };
}

/**
 * Période bornée par deux dates saisies. Renvoie `null` si la saisie n'est pas
 * exploitable — l'appelant retombe alors sur le raccourci par défaut plutôt
 * que d'afficher une erreur : une URL bricolée à la main ne doit pas casser la
 * page.
 *
 * Les saisies récupérables le sont : dates inversées remises dans l'ordre, fin
 * postérieure à hier ramenée à hier (au-delà, Google ne consolide rien).
 */
export function resolveCustomPeriod(rawStart?: string, rawEnd?: string): Period | null {
  if (!isDay(rawStart) || !isDay(rawEnd)) return null;

  let [start, end] = rawStart <= rawEnd ? [rawStart, rawEnd] : [rawEnd, rawStart];
  const last = parisYesterday();
  if (end > last) end = last;
  if (start < MIN_DAY) start = MIN_DAY;
  if (start > end) return null;

  const days = daysBetween(start, end);
  const prevEnd = shift(new Date(`${start}T00:00:00Z`), -1);
  const prevStart = shift(prevEnd, -(days - 1));

  return {
    key: "custom",
    label: days === 1 ? "1 jour" : `${days} jours`,
    days,
    current: { start, end },
    previous: { start: iso(prevStart), end: iso(prevEnd) },
  };
}

/** Point d'entrée de la page : les dates l'emportent sur le raccourci. */
export function resolvePeriodFromParams(params: {
  period?: string;
  start?: string;
  end?: string;
}): Period {
  return (
    resolveCustomPeriod(params.start, params.end) ??
    resolvePeriod(isPeriodKey(params.period) ? params.period : DEFAULT_PERIOD)
  );
}

/** Variation en pourcentage, `null` quand la période précédente est vide —
 *  passer de 0 à 12 n'est pas « +1200 % », c'est un démarrage. */
export function variation(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}
