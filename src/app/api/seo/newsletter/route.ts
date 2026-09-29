import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidSession, SEO_COOKIE } from "@/lib/seo-dashboard/auth";
import { fetchSubscribers, subscribersCsv } from "@/lib/seo-dashboard/newsletter";

/**
 * Export CSV des inscrits à la newsletter. Protégé par la session du tableau de
 * bord : c'est une liste d'adresses e-mail, elle ne sort jamais sans connexion.
 * Par défaut, les inscrits actifs seulement ; `?all=1` ajoute les désinscrits.
 */
export async function GET(req: Request) {
  const session = (await cookies()).get(SEO_COOKIE)?.value;
  if (!isValidSession(session)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await fetchSubscribers();
  if (!rows) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const all = new URL(req.url).searchParams.get("all") === "1";
  const list = all ? rows : rows.filter((r) => !r.unsubscribedAt);
  const stamp = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date());
  return new NextResponse(subscribersCsv(list), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="newsletter-bien-microdose-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
