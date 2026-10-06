import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/tableau-de-bord/ventes?du=YYYY-MM-DD&au=YYYY-MM-DD — les ventes de
 * la période pour le tableau de bord client Clickzou (carte « Ventes et
 * chiffre d'affaires »). Lecture seule.
 *
 * Accès : `Authorization: Bearer <TABLEAU_DE_BORD_CLE>`, comparé à temps
 * constant. Clé absente ou de moins de 32 caractères : 503, plutôt qu'une API
 * ouverte par oubli.
 *
 * Même définition que l'onglet Ventes de /seo (`src/lib/seo-dashboard/sales.ts`) :
 * commande `paid` ou `shipped` (le callback CardGate est la seule source du
 * paiement), datée à `paid_at` en heure de Paris ; `refunded` est écartée — la
 * table ne connaît que le remboursement intégral. CA = `total_cents`, TTC
 * livraison comprise, remise déduite.
 *
 * Aucune donnée client ne sort : seuls statut, date, total et devise sont lus.
 */
export const dynamic = "force-dynamic";

const DEVISE = "EUR";
const JOURS_MAX = 400;
const PAGE = 1000;
const ENTETES = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } as const;

type Ligne = { status: string; paid_at: string; total_cents: number; currency: string | null };

const reponse = (corps: unknown, status = 200) => NextResponse.json(corps, { status, headers: ENTETES });

const jourParis = (iso: string) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date(iso));

function dateValide(texte: string | null): Date | null {
  if (!texte || !/^\d{4}-\d{2}-\d{2}$/.test(texte)) return null;
  const d = new Date(`${texte}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== texte ? null : d;
}

function autorise(req: Request, cle: string): boolean {
  const attendu = Buffer.from(`Bearer ${cle}`);
  const donne = Buffer.from(req.headers.get("authorization") ?? "");
  return attendu.length === donne.length && timingSafeEqual(attendu, donne);
}

export async function GET(req: Request) {
  const cle = process.env.TABLEAU_DE_BORD_CLE;
  if (!cle || cle.length < 32) return reponse({ erreur: "Accès non configuré" }, 503);
  if (!autorise(req, cle)) return reponse({ erreur: "Non autorisé" }, 401);

  const q = new URL(req.url).searchParams;
  const du = dateValide(q.get("du"));
  const au = dateValide(q.get("au"));
  if (!du || !au || au < du) return reponse({ erreur: "Paramètres du et au attendus (YYYY-MM-DD, du ≤ au)" }, 400);
  if (Math.round((au.getTime() - du.getTime()) / 86_400_000) + 1 > JOURS_MAX) {
    return reponse({ erreur: `Période limitée à ${JOURS_MAX} jours` }, 400);
  }

  const db = supabaseAdmin();
  if (!db) return reponse({ erreur: "Base des commandes non configurée" }, 503);

  const debut = q.get("du")!;
  const fin = q.get("au")!;
  // Un jour de marge de chaque côté ; le tri exact se fait sur le jour parisien.
  const de = new Date(du.getTime() - 86_400_000).toISOString();
  const a = new Date(au.getTime() + 2 * 86_400_000).toISOString();

  const lignes: Ligne[] = [];
  for (let depart = 0; ; depart += PAGE) {
    const { data, error } = await db
      .from("orders")
      .select("status, paid_at, total_cents, currency")
      .in("status", ["paid", "shipped"])
      .not("paid_at", "is", null)
      .gte("paid_at", de)
      .lt("paid_at", a)
      .order("paid_at", { ascending: true })
      .range(depart, depart + PAGE - 1);
    if (error || !data) {
      console.error("tableau-de-bord: lecture des ventes", error);
      return reponse({ erreur: "La base des commandes n'a pas répondu" }, 502);
    }
    lignes.push(...(data as Ligne[]));
    if (data.length < PAGE) break;
  }

  const dansPeriode = lignes.filter((l) => {
    const jour = jourParis(l.paid_at);
    return jour >= debut && jour <= fin;
  });
  const ventes = dansPeriode.filter((l) => (l.currency ?? DEVISE).toUpperCase() === DEVISE);
  const autresDevises = dansPeriode.length - ventes.length;

  const parJour = new Map<string, { ventes: number; centimes: number }>();
  for (let t = du.getTime(); t <= au.getTime(); t += 86_400_000) {
    parJour.set(new Date(t).toISOString().slice(0, 10), { ventes: 0, centimes: 0 });
  }
  for (const v of ventes) {
    const jour = parJour.get(jourParis(v.paid_at))!;
    jour.ventes += 1;
    jour.centimes += v.total_cents;
  }
  const jours = [...parJour].map(([date, j]) => ({ date, ventes: j.ventes, ca: j.centimes / 100 }));

  let definition =
    "Vente = commande payée par carte (CardGate) sur le site, datée au jour de son paiement (heure de Paris) ; " +
    "commandes en attente, échouées ou annulées exclues. CA = total TTC encaissé (livraison comprise, remise déduite) ; " +
    "une commande remboursée ne compte plus.";
  if (autresDevises > 0) {
    definition += ` Seuls les montants en ${DEVISE} sont comptés : ${autresDevises} commande(s) dans une autre devise écartée(s).`;
  }

  return reponse({
    devise: DEVISE,
    ventes: ventes.length,
    ca: ventes.reduce((s, v) => s + v.total_cents, 0) / 100,
    parJour: jours,
    definition,
  });
}
