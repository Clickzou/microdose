import "server-only";
import { supabaseAdmin } from "@/lib/supabase";
import { getDictionary } from "@/dictionaries";
import type { PricedLine } from "@/lib/catalog";
import type { Period, Range } from "./periods";

/**
 * Ventes du tableau de bord, lues dans la table `orders` de Supabase.
 *
 * Contrairement à bien.health, dont le paiement se conclut sur Shopify, tout le
 * tunnel passe ici par le site : la commande payée est déjà en base, marquée
 * `paid` par le callback CardGate (seule source de vérité du paiement). Aucune
 * API tierce à brancher, aucune fenêtre d'historique.
 *
 * Une vente compte à sa date de paiement, en heure de Paris, comme les périodes.
 * Statuts retenus : `paid` et `shipped`. Les commandes remboursées sont écartées
 * des totaux et comptées à part, pour qu'un remboursement ne passe pas inaperçu.
 */

export type SalesTotals = { orders: number; revenue: number; averageOrder: number; items: number; currency: string };

export type RecentOrder = {
  number: number;
  /** Jour du paiement, en heure de Paris (YYYY-MM-DD). */
  paidDay: string;
  name: string;
  country: string;
  total: number;
  status: string;
};

export type Sales = {
  totals: SalesTotals;
  previousTotals: SalesTotals;
  refunded: { orders: number; revenue: number };
  daily: { date: string; orders: number; revenue: number }[];
  topProducts: { title: string; quantity: number; revenue: number }[];
  recent: RecentOrder[];
};

export type SalesStatus = "ok" | "not-configured" | "error";
export type SalesResult = { status: SalesStatus; data: Sales | null };

type OrderRow = {
  number: number;
  status: string;
  paid_at: string;
  first_name: string;
  last_name: string;
  country: string;
  items: PricedLine[];
  total_cents: number;
};

const parisDay = (iso: string) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date(iso));

/** Une journée de marge de chaque côté : le filtre exact se fait ensuite sur la date de Paris. */
function widen(r: Range): { from: string; to: string } {
  const from = new Date(`${r.start}T00:00:00Z`);
  from.setUTCDate(from.getUTCDate() - 1);
  const to = new Date(`${r.end}T00:00:00Z`);
  to.setUTCDate(to.getUTCDate() + 2);
  return { from: from.toISOString(), to: to.toISOString() };
}

function totalsOf(rows: OrderRow[]): SalesTotals {
  const revenue = rows.reduce((s, o) => s + o.total_cents, 0) / 100;
  const items = rows.reduce((s, o) => s + (o.items ?? []).reduce((n, l) => n + l.qty, 0), 0);
  return { orders: rows.length, revenue, averageOrder: rows.length ? revenue / rows.length : 0, items, currency: "EUR" };
}

export async function fetchSales(period: Period): Promise<SalesResult> {
  const db = supabaseAdmin();
  if (!db) return { status: "not-configured", data: null };

  const span = widen({ start: period.previous.start, end: period.current.end });
  const { data, error } = await db
    .from("orders")
    .select("number, status, paid_at, first_name, last_name, country, items, total_cents")
    .in("status", ["paid", "shipped", "refunded"])
    .not("paid_at", "is", null)
    .gte("paid_at", span.from)
    .lt("paid_at", span.to)
    .order("paid_at", { ascending: false })
    .limit(5000);
  if (error || !data) {
    console.error("seo: lecture des ventes", error);
    return { status: "error", data: null };
  }

  const rows = data as OrderRow[];
  const inRange = (o: OrderRow, r: Range) => {
    const day = parisDay(o.paid_at);
    return day >= r.start && day <= r.end;
  };
  const current = rows.filter((o) => inRange(o, period.current));
  const kept = current.filter((o) => o.status !== "refunded");
  const refunded = current.filter((o) => o.status === "refunded");
  const previous = rows.filter((o) => inRange(o, period.previous) && o.status !== "refunded");

  const daily = new Map<string, { orders: number; revenue: number }>();
  for (const o of kept) {
    const day = parisDay(o.paid_at);
    const d = daily.get(day) ?? { orders: 0, revenue: 0 };
    d.orders += 1;
    d.revenue += o.total_cents / 100;
    daily.set(day, d);
  }

  // Les noms de produits viennent du dictionnaire français : le tableau de bord est en français.
  const t = await getDictionary("fr");
  const products = new Map<string, { quantity: number; revenue: number }>();
  for (const o of kept) {
    for (const l of o.items ?? []) {
      const p = products.get(l.slug) ?? { quantity: 0, revenue: 0 };
      p.quantity += l.qty;
      p.revenue += l.totalCents / 100;
      products.set(l.slug, p);
    }
  }

  return {
    status: "ok",
    data: {
      totals: totalsOf(kept),
      previousTotals: totalsOf(previous),
      refunded: { orders: refunded.length, revenue: refunded.reduce((s, o) => s + o.total_cents, 0) / 100 },
      daily: [...daily].map(([date, d]) => ({ date, ...d })).sort((a, b) => a.date.localeCompare(b.date)),
      topProducts: [...products]
        .map(([slug, p]) => ({ title: t.products[slug as keyof typeof t.products]?.name ?? slug, ...p }))
        .sort((a, b) => b.revenue - a.revenue),
      recent: current.slice(0, 20).map((o) => ({
        number: o.number,
        paidDay: parisDay(o.paid_at),
        name: `${o.first_name} ${o.last_name}`,
        country: o.country,
        total: o.total_cents / 100,
        status: o.status,
      })),
    },
  };
}
