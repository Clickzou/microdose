/**
 * Google Analytics 4 — Data API v1beta.
 *
 * Deux lots de rapports (`batchRunReports`, cinq maximum par appel) plutôt que
 * neuf requêtes isolées : moins d'allers-retours, et surtout un lot « socle »
 * (audience, tendance, pages, canaux) séparé du lot « commerce et segments ».
 * Si la propriété n'a pas de données e-commerce, ou si une métrique n'existe
 * pas sur ce compte, seul le second lot échoue — les chiffres d'audience
 * restent affichés.
 *
 * Configuration : GA4_PROPERTY_ID (l'identifiant **numérique** de la propriété,
 * Admin → Paramètres de la propriété → Détails ; ce n'est pas le « G-… », qui
 * est un identifiant de flux de données) + le compte de service de google.ts,
 * ajouté en **Lecteur** sur la propriété.
 */
import { googleFetch, isGoogleConfigured } from "./google";
import type { Period } from "./periods";

const SCOPE = ["https://www.googleapis.com/auth/analytics.readonly"];
const API = "https://analyticsdata.googleapis.com/v1beta";

export function ga4PropertyId(): string {
  return (process.env.GA4_PROPERTY_ID || "").replace(/^properties\//, "").trim();
}

export function isGa4Configured(): boolean {
  return isGoogleConfigured() && ga4PropertyId() !== "";
}

type Row = { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] };
type Report = { rows?: Row[]; metricHeaders?: { name: string }[] };
type BatchResponse = { reports?: Report[] };

function metric(row: Row | undefined, index: number): number {
  const raw = row?.metricValues?.[index]?.value;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function dimension(row: Row, index: number): string {
  return row.dimensionValues?.[index]?.value ?? "";
}

/** Chiffres d'audience d'une période, tels qu'affichés en tête de tableau. */
export type Ga4Totals = {
  users: number;
  newUsers: number;
  sessions: number;
  pageViews: number;
  /** Part de sessions sans engagement, en % (GA4 la renvoie en 0-1). */
  bounceRate: number;
  engagementRate: number;
  /** Durée moyenne d'une session, en secondes. */
  avgSessionDuration: number;
};

export type Ga4Commerce = {
  transactions: number;
  revenue: number;
  addToCarts: number;
  checkouts: number;
  keyEvents: number;
};

export type NamedRow = { label: string; extra?: string; values: number[] };

export type Ga4Data = {
  totals: Ga4Totals;
  previousTotals: Ga4Totals;
  /** Une entrée par jour : date ISO, sessions, utilisateurs. */
  timeseries: { date: string; sessions: number; users: number }[];
  /** Une entrée par jour côté commerce, alignée sur les mêmes dates que
   *  `timeseries`. Vide si la propriété ne remonte pas d'événements d'achat. */
  commerceSeries: { date: string; addToCarts: number; checkouts: number; transactions: number; revenue: number }[];
  /** path, titre, vues, utilisateurs, taux de rebond %, durée moyenne s. */
  topPages: NamedRow[];
  /** canal, sessions, utilisateurs, taux d'engagement %. */
  channels: NamedRow[];
  countries: NamedRow[];
  devices: NamedRow[];
  /** Pages d'entrée du trafic de recherche organique. */
  organicLandings: NamedRow[];
  commerce: Ga4Commerce | null;
  previousCommerce: Ga4Commerce | null;
};

const CORE_METRICS = [
  "totalUsers",
  "newUsers",
  "sessions",
  "screenPageViews",
  "bounceRate",
  "engagementRate",
  "averageSessionDuration",
];

const COMMERCE_METRICS = ["transactions", "purchaseRevenue", "addToCarts", "checkouts", "keyEvents"];

function totalsFrom(report: Report | undefined): Ga4Totals {
  const row = report?.rows?.[0];
  return {
    users: metric(row, 0),
    newUsers: metric(row, 1),
    sessions: metric(row, 2),
    pageViews: metric(row, 3),
    bounceRate: metric(row, 4) * 100,
    engagementRate: metric(row, 5) * 100,
    avgSessionDuration: metric(row, 6),
  };
}

function commerceFrom(report: Report | undefined): Ga4Commerce | null {
  if (!report) return null;
  const row = report.rows?.[0];
  return {
    transactions: metric(row, 0),
    revenue: metric(row, 1),
    addToCarts: metric(row, 2),
    checkouts: metric(row, 3),
    keyEvents: metric(row, 4),
  };
}

function named(report: Report | undefined, metrics: number, extraDimension = false): NamedRow[] {
  return (report?.rows ?? []).map((row) => ({
    label: dimension(row, 0),
    extra: extraDimension ? dimension(row, 1) : undefined,
    values: Array.from({ length: metrics }, (_, i) => metric(row, i)),
  }));
}

export async function fetchGa4(period: Period): Promise<Ga4Data | null> {
  if (!isGa4Configured()) return null;

  const url = `${API}/properties/${ga4PropertyId()}:batchRunReports`;
  const cur = [{ startDate: period.current.start, endDate: period.current.end }];
  const prev = [{ startDate: period.previous.start, endDate: period.previous.end }];
  const m = (names: string[]) => names.map((name) => ({ name }));

  const core = await googleFetch<BatchResponse>(url, SCOPE, {
    requests: [
      { dateRanges: cur, metrics: m(CORE_METRICS) },
      { dateRanges: prev, metrics: m(CORE_METRICS) },
      {
        dateRanges: cur,
        dimensions: [{ name: "date" }],
        metrics: m(["sessions", "totalUsers"]),
        orderBys: [{ dimension: { dimensionName: "date" } }],
        limit: 400,
      },
      {
        dateRanges: cur,
        dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
        metrics: m(["screenPageViews", "totalUsers", "bounceRate", "averageSessionDuration"]),
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 25,
      },
      {
        dateRanges: cur,
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: m(["sessions", "totalUsers", "engagementRate"]),
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 12,
      },
    ],
  });
  if (!core?.reports) return null;

  // Second lot, facultatif : une propriété sans e-commerce le fait échouer
  // sans que cela n'enlève rien aux chiffres d'audience ci-dessus.
  const extra = await googleFetch<BatchResponse>(url, SCOPE, {
    requests: [
      { dateRanges: cur, metrics: m(COMMERCE_METRICS) },
      { dateRanges: prev, metrics: m(COMMERCE_METRICS) },
      {
        dateRanges: cur,
        dimensions: [{ name: "country" }],
        metrics: m(["sessions", "totalUsers"]),
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 10,
      },
      {
        dateRanges: cur,
        dimensions: [{ name: "deviceCategory" }],
        metrics: m(["sessions", "totalUsers"]),
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 5,
      },
      {
        dateRanges: cur,
        dimensions: [{ name: "landingPage" }],
        metrics: m(["sessions", "totalUsers", "bounceRate"]),
        dimensionFilter: {
          filter: {
            fieldName: "sessionDefaultChannelGroup",
            stringFilter: { matchType: "EXACT", value: "Organic Search" },
          },
        },
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 15,
      },
    ],
  });

  // Troisième appel, isolé lui aussi : la courbe commerce jour par jour. La
  // greffer sur le rapport de tendance du premier lot ferait tomber toute
  // l'audience si `addToCarts` n'existait pas sur la propriété.
  const daily = await googleFetch<BatchResponse>(url, SCOPE, {
    requests: [
      {
        dateRanges: cur,
        dimensions: [{ name: "date" }],
        metrics: m(["addToCarts", "checkouts", "transactions", "purchaseRevenue"]),
        orderBys: [{ dimension: { dimensionName: "date" } }],
        limit: 400,
      },
    ],
  });

  return {
    totals: totalsFrom(core.reports[0]),
    previousTotals: totalsFrom(core.reports[1]),
    timeseries: (core.reports[2]?.rows ?? []).map((row) => ({
      date: dimension(row, 0),
      sessions: metric(row, 0),
      users: metric(row, 1),
    })),
    commerceSeries: (daily?.reports?.[0]?.rows ?? []).map((row) => ({
      date: dimension(row, 0),
      addToCarts: metric(row, 0),
      checkouts: metric(row, 1),
      transactions: metric(row, 2),
      revenue: metric(row, 3),
    })),
    topPages: named(core.reports[3], 4, true),
    channels: named(core.reports[4], 3),
    countries: named(extra?.reports?.[2], 2),
    devices: named(extra?.reports?.[3], 2),
    organicLandings: named(extra?.reports?.[4], 3),
    commerce: commerceFrom(extra?.reports?.[0]),
    previousCommerce: commerceFrom(extra?.reports?.[1]),
  };
}

/* ------------------------------------------------------------ temps réel */

export type Ga4Realtime = {
  /** Visiteurs actifs sur le site à l'instant (fenêtre de 30 minutes de GA4). */
  activeUsers: number;
  /** Trente points, du plus ancien au plus récent : une barre par minute. */
  perMinute: number[];
  /** Pages où se trouvent ces visiteurs, la plus fréquentée en premier. */
  pages: { label: string; users: number }[];
  devices: { label: string; users: number }[];
  countries: { label: string; users: number }[];
  /** Horodatage de la lecture, affiché sous le compteur. */
  at: string;
};

/**
 * Rapport temps réel : ce qui se passe sur le site en ce moment.
 *
 * L'API temps réel n'accepte pas de lot — quatre appels, mais courts. Le total
 * est demandé sans dimension : additionner les visiteurs minute par minute
 * compterait plusieurs fois la même personne restée cinq minutes sur le site.
 *
 * `minutesAgo` vaut « 00 » pour la minute en cours et « 29 » pour la plus
 * ancienne ; on inverse donc l'ordre pour tracer le temps de gauche à droite.
 */
export async function fetchGa4Realtime(): Promise<Ga4Realtime | null> {
  if (!isGa4Configured()) return null;
  const url = `${API}/properties/${ga4PropertyId()}:runRealtimeReport`;
  const m = [{ name: "activeUsers" }];

  const [total, minutes, pages, devices, countries] = await Promise.all([
    googleFetch<Report>(url, SCOPE, { metrics: m }),
    googleFetch<Report>(url, SCOPE, { metrics: m, dimensions: [{ name: "minutesAgo" }], limit: 30 }),
    googleFetch<Report>(url, SCOPE, {
      metrics: m,
      dimensions: [{ name: "unifiedScreenName" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: 8,
    }),
    googleFetch<Report>(url, SCOPE, { metrics: m, dimensions: [{ name: "deviceCategory" }], limit: 3 }),
    googleFetch<Report>(url, SCOPE, {
      metrics: m,
      dimensions: [{ name: "country" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: 5,
    }),
  ]);
  if (!total) return null;

  const buckets = new Array<number>(30).fill(0);
  for (const row of minutes?.rows ?? []) {
    const ago = Number(dimension(row, 0));
    if (Number.isFinite(ago) && ago >= 0 && ago < 30) buckets[29 - ago] = metric(row, 0);
  }

  const list = (report: Report | null) =>
    (report?.rows ?? []).map((row) => ({ label: dimension(row, 0), users: metric(row, 0) }));

  return {
    activeUsers: metric(total.rows?.[0], 0),
    perMinute: buckets,
    pages: list(pages),
    devices: list(devices),
    countries: list(countries),
    at: new Date().toISOString(),
  };
}
