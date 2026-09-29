/**
 * Google Search Console — Search Analytics API v3.
 *
 * C'est la source des positions : Analytics ne sait pas sur quels mots-clés on
 * ressort, seul Search Console le sait. On interroge deux fois chaque axe
 * (période courante et période précédente) pour pouvoir afficher les
 * progressions et les reculs de position, qui sont l'essentiel de la lecture
 * SEO — un mot-clé qui passe de la position 14 à la 8 vaut plus qu'un mot-clé
 * stable en 3.
 *
 * Attention au décalage : Search Console consolide avec deux à trois jours de
 * retard. Les derniers jours d'une période paraissent donc creux, ce n'est pas
 * une chute de trafic.
 *
 * Configuration : le compte de service de google.ts ajouté en utilisateur de la
 * propriété (Search Console → Paramètres → Utilisateurs et autorisations), et
 * GSC_SITE_URL si la propriété n'est pas la propriété de domaine du site.
 */
import { googleFetch, isGoogleConfigured } from "./google";
import { SITE_URL } from "@/lib/seo";
import type { Period, Range } from "./periods";

const SCOPE = ["https://www.googleapis.com/auth/webmasters.readonly"];

export function gscSiteUrl(): string {
  const configured = process.env.GSC_SITE_URL?.trim();
  if (configured) return configured;
  try {
    // Propriété de domaine par défaut (sc-domain:bien-microdose.com) : elle
    // couvre tous les sous-domaines. GSC_SITE_URL la remplace si besoin.
    return `sc-domain:${new URL(SITE_URL).hostname}`;
  } catch {
    return "";
  }
}

export function isGscConfigured(): boolean {
  return isGoogleConfigured() && gscSiteUrl() !== "";
}

type GscRow = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number };
type GscResponse = { rows?: GscRow[] };

export type GscTotals = { clicks: number; impressions: number; ctr: number; position: number };
export type GscQuery = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  /** Position sur la période précédente, `null` si le mot-clé est nouveau. */
  previousPosition: number | null;
};
export type GscPage = { page: string; clicks: number; impressions: number; ctr: number; position: number };

export type GscData = {
  siteUrl: string;
  totals: GscTotals;
  previousTotals: GscTotals;
  timeseries: { date: string; clicks: number; impressions: number; position: number }[];
  queries: GscQuery[];
  pages: GscPage[];
  countries: { country: string; clicks: number; impressions: number }[];
  devices: { device: string; clicks: number; impressions: number }[];
};

function query(site: string, body: Record<string, unknown>) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
  return googleFetch<GscResponse>(url, SCOPE, body);
}

function range(r: Range) {
  return { startDate: r.start, endDate: r.end };
}

function totalsFrom(res: GscResponse | null): GscTotals {
  const row = res?.rows?.[0];
  return {
    clicks: row?.clicks ?? 0,
    impressions: row?.impressions ?? 0,
    ctr: (row?.ctr ?? 0) * 100,
    position: row?.position ?? 0,
  };
}

export async function fetchGsc(period: Period): Promise<GscData | null> {
  if (!isGscConfigured()) return null;
  const site = gscSiteUrl();

  const [totals, previousTotals, byDate, byQuery, byQueryPrev, byPage, byCountry, byDevice] = await Promise.all([
    query(site, { ...range(period.current), dimensions: [] }),
    query(site, { ...range(period.previous), dimensions: [] }),
    query(site, { ...range(period.current), dimensions: ["date"], rowLimit: 400 }),
    query(site, { ...range(period.current), dimensions: ["query"], rowLimit: 100 }),
    query(site, { ...range(period.previous), dimensions: ["query"], rowLimit: 250 }),
    query(site, { ...range(period.current), dimensions: ["page"], rowLimit: 25 }),
    query(site, { ...range(period.current), dimensions: ["country"], rowLimit: 8 }),
    query(site, { ...range(period.current), dimensions: ["device"], rowLimit: 3 }),
  ]);

  // Les huit appels passent par le même jeton : si le premier échoue, c'est que
  // la propriété n'est pas accessible au compte de service, rien ne sert
  // d'afficher un tableau vide.
  if (!totals) return null;

  const previousByQuery = new Map<string, number>();
  for (const row of byQueryPrev?.rows ?? []) {
    if (row.keys?.[0] && typeof row.position === "number") previousByQuery.set(row.keys[0], row.position);
  }

  return {
    siteUrl: site,
    totals: totalsFrom(totals),
    previousTotals: totalsFrom(previousTotals),
    timeseries: (byDate?.rows ?? []).map((row) => ({
      date: row.keys?.[0] ?? "",
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      position: row.position ?? 0,
    })),
    queries: (byQuery?.rows ?? []).map((row) => ({
      query: row.keys?.[0] ?? "",
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: (row.ctr ?? 0) * 100,
      position: row.position ?? 0,
      previousPosition: previousByQuery.get(row.keys?.[0] ?? "") ?? null,
    })),
    pages: (byPage?.rows ?? []).map((row) => ({
      page: row.keys?.[0] ?? "",
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: (row.ctr ?? 0) * 100,
      position: row.position ?? 0,
    })),
    countries: (byCountry?.rows ?? []).map((row) => ({
      country: row.keys?.[0] ?? "",
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
    })),
    devices: (byDevice?.rows ?? []).map((row) => ({
      device: row.keys?.[0] ?? "",
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
    })),
  };
}
