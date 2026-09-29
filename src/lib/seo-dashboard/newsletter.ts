import "server-only";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Inscrits à la newsletter, lus dans la table `newsletter_subscribers`.
 *
 * Deux sources d'inscription : le formulaire du pied de page (`site`) et la case
 * cochée à la commande (`checkout`), plus les inscrits repris de l’ancien site
 * (`ancien-site`, formulaires de la sauvegarde WordPress). Aucun outil d'envoi n'est branché : la liste
 * s'exporte en CSV depuis l'onglet Newsletter du tableau de bord.
 */

export type Subscriber = {
  email: string;
  lang: string;
  source: string;
  createdAt: string;
  unsubscribedAt: string | null;
};

/** Plafond de lecture : largement au-dessus du volume attendu, sans risque de page infinie. */
const MAX_ROWS = 20000;
const PAGE = 1000;

export async function fetchSubscribers(): Promise<Subscriber[] | null> {
  const db = supabaseAdmin();
  if (!db) return null;
  const rows: Subscriber[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await db
      .from("newsletter_subscribers")
      .select("email, lang, source, created_at, unsubscribed_at")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("seo: newsletter", error);
      return null;
    }
    for (const r of data) rows.push({ email: r.email, lang: r.lang, source: r.source, createdAt: r.created_at, unsubscribedAt: r.unsubscribed_at });
    if (data.length < PAGE) break;
  }
  return rows;
}

/** Libellé lisible de la source d’inscription. */
export function sourceLabel(source: string): string {
  return ({ checkout: "Case cochée à la commande", "ancien-site": "Ancien site", site: "Formulaire du site" } as Record<string, string>)[source] ?? source;
}

/** Inscrits des `days` derniers jours. */
export function countRecent(rows: Subscriber[], days: number): number {
  const since = Date.now() - days * 86_400_000;
  return rows.filter((r) => new Date(r.createdAt).getTime() >= since).length;
}

/** CSV au format Excel français : séparateur « ; », BOM UTF-8, dates JJ/MM/AAAA. */
export function subscribersCsv(rows: Subscriber[]): string {
  const day = (iso: string | null) => (iso ? new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris" }).format(new Date(iso)) : "");
  const cell = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [
    ["email", "langue", "source", "inscrit le", "désinscrit le"],
    ...rows.map((r) => [r.email, r.lang, sourceLabel(r.source), day(r.createdAt), day(r.unsubscribedAt)]),
  ];
  return "﻿" + lines.map((l) => l.map(cell).join(";")).join("\r\n") + "\r\n";
}
