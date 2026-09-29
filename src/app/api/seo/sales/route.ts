import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { resolvePeriodFromParams } from "@/lib/seo-dashboard/periods";
import { fetchSales } from "@/lib/seo-dashboard/sales";

/**
 * Ventes de bien-microdose.com pour le tableau de bord commun, hébergé sur
 * bien.health/seo (onglet « Microdose »).
 *
 * Accès serveur à serveur uniquement : bien.health envoie le jeton partagé
 * `SEO_DASHBOARD_API_TOKEN` (même valeur que `MICRODOSE_DASHBOARD_TOKEN` côté
 * bien.health). Ainsi, la clé de service Supabase de Microdose ne quitte jamais
 * ce projet. Sans jeton configuré, le point d'accès reste fermé.
 *
 * Paramètres : ceux de la page du tableau de bord (`period`, ou `start` + `end`).
 */
const digest = (s: string) => createHash("sha256").update(s).digest();

export async function GET(req: Request) {
  const expected = process.env.SEO_DASHBOARD_API_TOKEN;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || !timingSafeEqual(digest(given), digest(expected))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const q = new URL(req.url).searchParams;
  const period = resolvePeriodFromParams({
    period: q.get("period") ?? undefined,
    start: q.get("start") ?? undefined,
    end: q.get("end") ?? undefined,
  });
  const result = await fetchSales(period);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
