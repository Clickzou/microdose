import { cookies } from "next/headers";
import { isAuthConfigured, isValidSession, SEO_COOKIE } from "@/lib/seo-dashboard/auth";
import { countRecent, fetchSubscribers, sourceLabel } from "@/lib/seo-dashboard/newsletter";
import LoginForm from "../login-form";
import DashboardTabs from "../tabs";
import { BarList, Card, Kpi, Table, num } from "../ui";

/**
 * Onglet Newsletter : les inscrits, leurs langues et sources, et l'export CSV
 * (aucun outil d'envoi n'est branché — la liste part vers celui de BIEN).
 */

const LANGS: Record<string, string> = { en: "Anglais", fr: "Français", de: "Allemand", nl: "Néerlandais" };
const day = (iso: string) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "medium" }).format(new Date(iso));

/** Page protégée par cookie : toujours rendue à la demande, jamais prérendue au build. */
export const dynamic = "force-dynamic";

export default async function NewsletterTab() {
  if (!isAuthConfigured()) {
    return <main className="min-h-screen grid place-items-center px-4 text-sm text-[#5a6472]">Tableau de bord fermé.</main>;
  }
  const session = (await cookies()).get(SEO_COOKIE)?.value;
  if (!isValidSession(session)) return <LoginForm />;

  const rows = await fetchSubscribers();
  const active = rows?.filter((r) => !r.unsubscribedAt) ?? [];
  const recent = countRecent(active, 30);
  const count = (key: (r: (typeof active)[number]) => string) => {
    const m = new Map<string, number>();
    for (const r of active) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-black/[0.08]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3.5 flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="mr-auto">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#1379b0]">Clickzou</p>
            <h1 className="text-xl font-semibold tracking-tight leading-tight">SEO by Clickzou</h1>
          </div>
          <DashboardTabs active="newsletter" />
          <form action="/api/seo/logout" method="post">
            <button type="submit" className="rounded-full px-3.5 py-1.5 text-[12px] bg-black/[0.04] text-[#5a6472] hover:text-[#00112b] transition">
              Déconnexion
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 pb-20">
        {!rows ? (
          <Card className="mt-8">
            <p className="text-sm text-[#5a6472]">Base de données indisponible : la liste ne peut pas être lue pour le moment.</p>
          </Card>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Inscrits à la newsletter</h2>
                <p className="text-xs text-[#818a97]">Formulaire du pied de page et case cochée à la commande. Aucun outil d&apos;envoi branché : exporter la liste.</p>
              </div>
              <div className="flex gap-2">
                <form action="/api/seo/newsletter" method="get">
                  <button type="submit" className="rounded-full bg-[#00112b] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#243348] transition">
                    Exporter en CSV ({num(active.length)})
                  </button>
                </form>
                {rows.length > active.length ? (
                  <form action="/api/seo/newsletter" method="get">
                    <input type="hidden" name="all" value="1" />
                    <button type="submit" className="rounded-full bg-black/[0.04] px-5 py-2.5 text-[13px] text-[#5a6472] hover:text-[#00112b] transition">
                      Avec les désinscrits ({num(rows.length)})
                    </button>
                  </form>
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Kpi label="Inscrits actifs" value={num(active.length)} />
              <Kpi label="Nouveaux sur 30 jours" value={num(recent)} />
              <Kpi label="Désinscrits" value={num(rows.length - active.length)} />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Card title="Par langue">
                <BarList rows={count((r) => LANGS[r.lang] ?? r.lang)} />
              </Card>
              <Card title="Par source">
                <BarList rows={count((r) => sourceLabel(r.source))} />
              </Card>
            </div>

            <Card title="Liste des inscrits" subtitle="Du plus récent au plus ancien" className="mt-6">
              <Table
                head={["E-mail", "Langue", "Source", "Inscrit le", "Statut"]}
                rows={rows.map((r) => [
                  r.email,
                  r.lang.toUpperCase(),
                  sourceLabel(r.source),
                  day(r.createdAt),
                  r.unsubscribedAt ? `Désinscrit le ${day(r.unsubscribedAt)}` : "Actif",
                ])}
              />
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
