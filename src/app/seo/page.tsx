import { cookies } from "next/headers";
import Link from "next/link";
import { isAuthConfigured, isValidSession, SEO_COOKIE } from "@/lib/seo-dashboard/auth";
import { MIN_DAY, PERIODS, parisYesterday, resolvePeriodFromParams, variation, type PeriodKey } from "@/lib/seo-dashboard/periods";
import { fetchGa4, isGa4Configured, ga4PropertyId } from "@/lib/seo-dashboard/ga4";
import { fetchGsc, isGscConfigured, gscSiteUrl } from "@/lib/seo-dashboard/gsc";
import { fetchSales } from "@/lib/seo-dashboard/sales";
import LoginForm from "./login-form";
import DateRange from "./date-range";
import KeywordTable from "./keyword-table";
import RealtimePanel from "./realtime";
import {
  BarList,
  Card,
  Kpi,
  LineChart,
  NotConnected,
  PageCell,
  SectionTitle,
  StatusDot,
  Table,
  duration,
  longDate,
  money,
  num,
  pct,
} from "./ui";
import { channelLabel, countryLabel, deviceLabel } from "./labels";

/**
 * Tableau de bord « SEO by Clickzou » — bien-microdose.com.
 *
 * Repris de celui de bien.health. Trois sources, interrogées en parallèle et
 * indépendantes l'une de l'autre : Google Analytics 4 (audience, pages, canaux),
 * Search Console (mots-clés et positions) et la table `orders` de Supabase
 * (ventes). Une source absente affiche sa procédure de branchement — on
 * n'affiche jamais de chiffres de démonstration, qui donneraient l'illusion
 * d'un suivi qui n'existe pas.
 */

// Teintes de marque assombries pour le fond clair : le bleu ciel et le rose du
// site sont calibrés sur fond sombre ; en trait de 2 px sur blanc, ils disparaissent.
const CHART_BLUE = "#1379b0";
const CHART_GREEN = "#238f5e";
const CHART_PINK = "#d4568e";
const CHART_AMBER = "#c2760b";

/** Premier jour où le site envoie `add_to_cart` et `begin_checkout` à GA4 (le
 *  suivi n'existait pas sur l'ancien WordPress). */
const CART_TRACKING_SINCE = "2026-09-29";

/** Page protégée par cookie : toujours rendue à la demande, jamais prérendue au build. */
export const dynamic = "force-dynamic";

export default async function SeoDashboard({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; start?: string; end?: string }>;
}) {
  if (!isAuthConfigured()) {
    return (
      <main className="min-h-screen grid place-items-center px-4 bg-[#f6f7f9]">
        <p className="max-w-sm text-center text-sm text-[#5a6472]">
          Tableau de bord fermé : la variable <code>SEO_DASHBOARD_PASSWORD</code> n&apos;est pas renseignée dans Vercel.
        </p>
      </main>
    );
  }
  const session = (await cookies()).get(SEO_COOKIE)?.value;
  if (!isValidSession(session)) return <LoginForm />;

  const period = resolvePeriodFromParams(await searchParams);
  const key = period.key;

  const [ga4, gsc, salesResult] = await Promise.all([fetchGa4(period), fetchGsc(period), fetchSales(period)]);

  // Search Console publie avec deux à trois jours de retard, et la période
  // choisie déborde donc toujours sur des jours qu'elle n'a pas encore. On
  // affiche les dates réellement couvertes plutôt que celles demandées.
  const gscDays = gsc?.timeseries.map((d) => d.date).sort() ?? [];
  const gscRange = gscDays.length
    ? `Données arrêtées au ${longDate(gscDays[gscDays.length - 1])} (premier jour : ${longDate(gscDays[0])})`
    : null;

  // Courbe commerce. Deux sources distinctes, d'où leur séparation : l'ajout au
  // panier est compté par Analytics (visiteurs ayant accepté les cookies
  // seulement), la commande payée est lue en base (toutes, sans exception). On
  // ne les confond jamais : la seconde n'est pas un sous-ensemble de la première.
  const byDay = new Map((ga4?.commerceSeries ?? []).map((d) => [d.date, d]));
  const hasCartSeries = (ga4?.commerceSeries ?? []).some((d) => d.addToCarts > 0);

  // Les commandes sont datées « 2026-08-29 », les jours d'Analytics
  // « 20260829 » : on aligne sur le format d'Analytics, qui porte les abscisses.
  const sales = salesResult.data;
  const salesByDay = new Map((sales?.daily ?? []).map((d) => [d.date.replace(/-/g, ""), d]));
  const hasSalesSeries = (sales?.daily ?? []).some((d) => d.orders > 0);

  const t = ga4?.totals;
  const p = ga4?.previousTotals;
  const commerce = ga4?.commerce;

  // Le site n'envoie `add_to_cart` à Analytics que depuis CART_TRACKING_SINCE :
  // comparer une période à cheval sur cette date à la précédente opposerait une
  // période mesurée à une période qui ne l'était pas.
  const cartComparable = period.previous.start >= CART_TRACKING_SINCE;
  const cartDelta =
    commerce && ga4?.previousCommerce && cartComparable
      ? variation(commerce.addToCarts, ga4.previousCommerce.addToCarts)
      : undefined;
  const cartNote =
    period.current.start < CART_TRACKING_SINCE
      ? `Mesuré sur le site depuis le ${longDate(CART_TRACKING_SINCE)} seulement`
      : undefined;

  return (
    <div className="min-h-screen">
      {/* -------------------------------------------------------- en-tête */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-black/[0.08]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <div className="mr-auto">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#1379b0]">Clickzou</p>
              <h1 className="text-xl font-semibold tracking-tight leading-tight">SEO by Clickzou</h1>
            </div>

            <nav className="flex gap-1" aria-label="Période">
              {(Object.keys(PERIODS) as PeriodKey[]).map((k) => (
                <Link
                  key={k}
                  href={`/seo?period=${k}`}
                  prefetch={false}
                  className={`rounded-full px-3.5 py-1.5 text-[12px] transition ${
                    k === key ? "bg-sky text-ink font-semibold" : "bg-black/[0.04] text-[#5a6472] hover:text-[#00112b]"
                  }`}
                >
                  {PERIODS[k].label}
                </Link>
              ))}
              <DateRange
                start={period.current.start}
                end={period.current.end}
                min={MIN_DAY}
                max={parisYesterday()}
                active={key === "custom"}
              />
            </nav>

            <form action="/api/seo/logout" method="post">
              <button type="submit" className="rounded-full px-3.5 py-1.5 text-[12px] bg-black/[0.04] text-[#5a6472] hover:text-[#00112b] transition">
                Déconnexion
              </button>
            </form>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2.5">
            <p className="text-[11px] text-[#77808e]">
              bien-microdose.com · du <strong className="text-[#465269] font-medium">{longDate(period.current.start)}</strong> au{" "}
              <strong className="text-[#465269] font-medium">{longDate(period.current.end)}</strong>
            </p>
            <StatusDot ok={!!ga4} label="Analytics" />
            <StatusDot ok={!!gsc} label="Search Console" />
            <StatusDot ok={!!sales} label="Commandes" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 pb-20">
        {/* --------------------------------------------------- temps réel */}
        <div className="mt-6">
          <RealtimePanel enabled />
        </div>

        {/* ------------------------------------------------------ synthèse */}
        <SectionTitle hint="Les chiffres comparent la période choisie à la période immédiatement précédente, de même durée.">
          Vue d&apos;ensemble
        </SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi
            label="Visiteurs"
            value={t ? num(t.users) : "—"}
            delta={t && p ? variation(t.users, p.users) : undefined}
            hint={t ? undefined : "Analytics non connecté"}
            note={t ? "Seulement ceux qui acceptent les cookies" : undefined}
          />
          {/* Les deux premières cartes ne comptent pas la même population :
              Analytics ne se charge qu'après « Accepter », Search Console voit
              tous les clics. Sur août-septembre 2026, 205 clics Google pour 75
              visiteurs venus de Google selon Analytics. */}
          <Kpi
            label="Clics depuis Google"
            value={gsc ? num(gsc.totals.clicks) : "—"}
            delta={gsc ? variation(gsc.totals.clicks, gsc.previousTotals.clicks) : undefined}
            hint={gsc ? undefined : "Search Console non connectée"}
            note={gsc ? "Tous les visiteurs, cookies acceptés ou non" : undefined}
          />
          <Kpi
            label="Position moyenne"
            value={gsc ? gsc.totals.position.toFixed(1) : "—"}
            delta={gsc ? variation(gsc.totals.position, gsc.previousTotals.position) : undefined}
            invert
            hint={gsc ? undefined : "Search Console non connectée"}
          />
          {/* Dernier repère de la ligne : l'ajout au panier, mesuré par Analytics.
              Les commandes payées, elles, sont dans le bloc Ventes. */}
          <Kpi
            label="Ajouts au panier"
            value={commerce ? num(commerce.addToCarts) : "—"}
            delta={cartDelta}
            hint={commerce ? (cartComparable ? undefined : "Pas de comparaison possible") : "Analytics non connecté"}
            note={commerce ? cartNote : undefined}
          />
        </div>

        {/* -------------------------------------------------------- ventes */}
        <SectionTitle hint="Source : commandes payées enregistrées par le site (Supabase), à leur date de paiement. Remboursements exclus.">
          Ventes
        </SectionTitle>
        {sales ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi
                label="Chiffre d'affaires"
                value={money(sales.totals.revenue, sales.totals.currency)}
                delta={variation(sales.totals.revenue, sales.previousTotals.revenue)}
                note="TTC, livraison comprise"
              />
              <Kpi
                label="Commandes"
                value={num(sales.totals.orders)}
                delta={variation(sales.totals.orders, sales.previousTotals.orders)}
              />
              <Kpi
                label="Panier moyen"
                value={money(sales.totals.averageOrder, sales.totals.currency)}
                delta={variation(sales.totals.averageOrder, sales.previousTotals.averageOrder)}
              />
              {/* Les commandes comptent tous les acheteurs, les sessions seulement
                  ceux qui acceptent les cookies : le taux est donc surestimé, et
                  l'écran le dit plutôt que de présenter un chiffre trompeur. */}
              <Kpi
                label="Taux de conversion"
                value={t && t.sessions ? pct((sales.totals.orders / t.sessions) * 100) : "—"}
                hint={t ? undefined : "Analytics non connecté"}
                note={t ? "Commandes rapportées aux visites mesurées : surestimé, les refus de cookies n'étant pas comptés" : undefined}
              />
            </div>

            {sales.refunded.orders > 0 && (
              <p className="mt-3 text-[12px] text-[#8a5a2b] bg-[#fdf4e7] ring-1 ring-amber-500/30 rounded-lg px-3 py-2 max-w-4xl">
                {num(sales.refunded.orders)} commande{sales.refunded.orders > 1 ? "s" : ""} remboursée
                {sales.refunded.orders > 1 ? "s" : ""} sur la période, pour {money(sales.refunded.revenue, sales.totals.currency)}.
                Non comptée{sales.refunded.orders > 1 ? "s" : ""} dans les chiffres ci-dessus.
              </p>
            )}

            <div className="grid lg:grid-cols-2 gap-3 mt-3">
              <Card title="Produits vendus" subtitle="Sur la période, par chiffre d'affaires (hors livraison)">
                <Table
                  head={["Produit", "Quantité", "Chiffre d'affaires"]}
                  rows={sales.topProducts.map((row) => [
                    <span key="p" className="block truncate" title={row.title}>
                      {row.title}
                    </span>,
                    num(row.quantity),
                    money(row.revenue, sales.totals.currency),
                  ])}
                />
              </Card>
              {/* Faute d'espace d'administration, c'est ici que BIEN voit arriver
                  les commandes. Le détail complet (adresse, e-mail) reste dans
                  Supabase et dans l'e-mail de notification. */}
              <Card title="Dernières commandes" subtitle="Sur la période, la plus récente en premier">
                <Table
                  head={["Commande", "Payée le", "Pays", "Montant"]}
                  rows={sales.recent.map((o) => [
                    <span key="o" className="block truncate">
                      <span className="font-medium text-[#00112b]">BM{o.number}</span>{" "}
                      <span className="text-[#77808e]">— {o.name}</span>
                      {o.status !== "paid" && (
                        <span className="ml-1.5 rounded px-1 py-px text-[10px] font-medium text-[#3f6c88] bg-sky/25">
                          {o.status === "shipped" ? "expédiée" : "remboursée"}
                        </span>
                      )}
                    </span>,
                    longDate(o.paidDay),
                    countryLabel(o.country),
                    money(o.total, sales.totals.currency),
                  ])}
                />
              </Card>
            </div>
          </>
        ) : (
          <NotConnected
            title={salesResult.status === "not-configured" ? "La base des commandes n'est pas configurée" : "La base des commandes n'a pas répondu"}
            why={
              salesResult.status === "not-configured"
                ? "Les ventes se lisent dans la table orders de Supabase, avec la clé de service du site."
                : "La lecture de la table orders a échoué. Le détail de l'erreur figure dans les journaux Vercel (recherche : « seo: lecture des ventes »)."
            }
            steps={[
              "Vérifier dans Vercel les variables <code>SUPABASE_URL</code> et <code>SUPABASE_SERVICE_ROLE_KEY</code>.",
              "Redéployer, puis recharger cette page.",
            ]}
          />
        )}

        {/* ------------------------------------------------------ audience */}
        <SectionTitle hint="Source : Google Analytics 4">Audience du site</SectionTitle>
        {ga4 && t && p ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi label="Sessions" value={num(t.sessions)} delta={variation(t.sessions, p.sessions)} />
              <Kpi label="Nouveaux visiteurs" value={num(t.newUsers)} delta={variation(t.newUsers, p.newUsers)} />
              <Kpi label="Pages vues" value={num(t.pageViews)} delta={variation(t.pageViews, p.pageViews)} />
              <Kpi label="Pages par session" value={t.sessions ? (t.pageViews / t.sessions).toFixed(1) : "—"} hint="Profondeur de visite" />
              <Kpi label="Taux de rebond" value={pct(t.bounceRate)} delta={variation(t.bounceRate, p.bounceRate)} invert />
              <Kpi label="Taux d'engagement" value={pct(t.engagementRate)} delta={variation(t.engagementRate, p.engagementRate)} />
              <Kpi label="Durée moyenne" value={duration(t.avgSessionDuration)} delta={variation(t.avgSessionDuration, p.avgSessionDuration)} />
              <Kpi
                label="Ajouts au panier"
                value={commerce ? num(commerce.addToCarts) : "—"}
                delta={cartDelta}
                hint={cartComparable ? undefined : "Pas de comparaison possible"}
                note={cartNote}
              />
            </div>

            <p className="mt-3 text-[12px] text-[#6b7482] leading-relaxed max-w-4xl">
              <strong className="font-medium text-[#465269]">Sessions</strong> : les visites, une même personne pouvant
              revenir plusieurs fois. <strong className="font-medium text-[#465269]">Visiteurs</strong> : les personnes
              distinctes. <strong className="font-medium text-[#465269]">Taux de rebond</strong> : la part des visites
              qui s&apos;arrêtent à une seule page. <strong className="font-medium text-[#465269]">Taux d&apos;engagement</strong> :
              à l&apos;inverse, la part des visites qui durent, chargent plusieurs pages ou déclenchent une action.
            </p>

            <div className="mt-3">
              <Card
                title={hasSalesSeries ? "Trafic et ventes jour par jour" : "Trafic et ajouts au panier jour par jour"}
                subtitle={
                  hasSalesSeries
                    ? "Visites et ajouts au panier mesurés par Analytics, commandes payées lues en base."
                    : "Visites et ajouts au panier mesurés par Analytics. Aucune commande payée sur la période."
                }
              >
                <LineChart
                  labels={ga4.timeseries.map((d) => d.date)}
                  series={[
                    { label: "Sessions", color: CHART_BLUE, points: ga4.timeseries.map((d) => d.sessions) },
                    { label: "Visiteurs", color: CHART_GREEN, points: ga4.timeseries.map((d) => d.users) },
                    ...(hasCartSeries
                      ? [
                          {
                            label: "Ajouts au panier",
                            color: CHART_AMBER,
                            points: ga4.timeseries.map((d) => byDay.get(d.date)?.addToCarts ?? 0),
                          },
                        ]
                      : []),
                    ...(hasSalesSeries
                      ? [
                          {
                            label: "Commandes",
                            color: CHART_PINK,
                            points: ga4.timeseries.map((d) => salesByDay.get(d.date)?.orders ?? 0),
                          },
                        ]
                      : []),
                  ]}
                />
              </Card>
            </div>

            <div className="grid lg:grid-cols-3 gap-3 mt-3">
              <Card title="D'où vient le trafic" subtitle="Sessions par canal">
                <BarList rows={ga4.channels.map((c) => ({ label: channelLabel(c.label), value: c.values[0] }))} />
              </Card>
              <Card title="Pays" subtitle="Sessions">
                <BarList rows={ga4.countries.map((c) => ({ label: countryLabel(c.label), value: c.values[0] }))} />
              </Card>
              <Card title="Appareils" subtitle="Sessions">
                <BarList rows={ga4.devices.map((d) => ({ label: deviceLabel(d.label), value: d.values[0] }))} />
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-3 mt-3">
              <Card title="Pages les plus vues" subtitle="Toutes sources confondues">
                <Table
                  head={["Page", "Vues", "Visiteurs", "Taux de rebond"]}
                  rows={ga4.topPages.map((row) => [
                    <PageCell key="p" path={row.label} title={row.extra} />,
                    num(row.values[0]),
                    num(row.values[1]),
                    pct(row.values[2] * 100),
                  ])}
                />
              </Card>
              <Card title="Pages d'entrée SEO" subtitle="Sessions arrivées par la recherche organique">
                <Table
                  head={["Page d'entrée", "Visites", "Visiteurs", "Taux de rebond"]}
                  rows={ga4.organicLandings.map((row) => [
                    <PageCell key="p" path={row.label} />,
                    num(row.values[0]),
                    num(row.values[1]),
                    pct(row.values[2] * 100),
                  ])}
                />
              </Card>
            </div>
          </>
        ) : (
          <NotConnected
            title="Google Analytics 4 n'est pas encore relié au tableau de bord"
            why={`Deux choses distinctes : le suivi (le site envoie ses visites à une propriété GA4, via NEXT_PUBLIC_GA_ID — ${process.env.NEXT_PUBLIC_GA_ID ? `${process.env.NEXT_PUBLIC_GA_ID} renseigné` : "pas encore renseigné : aucune visite n'est mesurée"}) et la lecture de ces données par ce tableau de bord, qui demande un accès en lecture.`}
            steps={[
              "Dans <strong>Google Analytics</strong>, créer une propriété GA4 dédiée à bien-microdose.com (distincte de celle de bien.health), avec un flux Web. Copier son identifiant <code>G-…</code> dans Vercel, variable <code>NEXT_PUBLIC_GA_ID</code>.",
              "Le compte de service Google du tableau de bord de bien.health peut servir ici aussi : reprendre sa valeur <code>GOOGLE_SERVICE_ACCOUNT_JSON</code> (projet Vercel de bien.health) dans celui-ci.",
              "Dans <strong>GA4</strong> → Admin → Gestion des accès à la propriété, ajouter l'adresse de ce compte de service (…@….iam.gserviceaccount.com) avec le rôle <strong>Lecteur</strong>.",
              "Dans <strong>Search Console</strong>, propriété bien-microdose.com → Paramètres → Utilisateurs et autorisations, ajouter la même adresse en autorisation <strong>Complète</strong>.",
              "Renseigner dans Vercel <code>GA4_PROPERTY_ID</code> (l'identifiant <strong>numérique</strong> de la propriété, Admin → Détails de la propriété — pas le <code>G-…</code>), puis redéployer.",
              `État actuel : identifiant de propriété ${ga4PropertyId() ? `<code>${ga4PropertyId()}</code> renseigné` : "<strong>absent</strong>"}, compte de service ${isGa4Configured() ? "lu correctement" : "<strong>absent ou illisible</strong>"}.`,
            ]}
          />
        )}

        {/* ------------------------------------------------ search console */}
        <SectionTitle
          hint={
            gscRange
              ? `Source : Google Search Console. ${gscRange} — Google publie avec deux à trois jours de retard, les tout derniers jours sont donc incomplets.`
              : "Source : Google Search Console — deux à trois jours de décalage, les tout derniers jours sont incomplets"
          }
        >
          Référencement Google
        </SectionTitle>
        {gsc ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi label="Clics" value={num(gsc.totals.clicks)} delta={variation(gsc.totals.clicks, gsc.previousTotals.clicks)} />
              <Kpi label="Impressions" value={num(gsc.totals.impressions)} delta={variation(gsc.totals.impressions, gsc.previousTotals.impressions)} />
              <Kpi label="CTR" value={pct(gsc.totals.ctr)} delta={variation(gsc.totals.ctr, gsc.previousTotals.ctr)} />
              <Kpi label="Position moyenne" value={gsc.totals.position.toFixed(1)} delta={variation(gsc.totals.position, gsc.previousTotals.position)} invert />
            </div>

            <p className="mt-3 text-[12px] text-[#6b7482] leading-relaxed max-w-4xl">
              <strong className="font-medium text-[#465269]">Impressions</strong> : le nombre de fois où une page du site
              est apparue dans les résultats de Google. <strong className="font-medium text-[#465269]">Clics</strong> :
              les visites qui en ont découlé. <strong className="font-medium text-[#465269]">CTR</strong> : la part des
              impressions transformées en clic. <strong className="font-medium text-[#465269]">Position moyenne</strong> :
              le rang moyen dans les résultats — 1 correspond à la première place, 11 au début de la deuxième page.
            </p>

            <div className="mt-3">
              <Card title="Clics et impressions jour par jour">
                <LineChart
                  labels={gsc.timeseries.map((d) => d.date)}
                  series={[
                    { label: "Clics", color: CHART_BLUE, points: gsc.timeseries.map((d) => d.clicks) },
                    { label: "Impressions", color: CHART_PINK, points: gsc.timeseries.map((d) => d.impressions) },
                  ]}
                />
              </Card>
            </div>

            <div className="mt-3">
              <Card
                title="Mots-clés et positions"
                subtitle={`Propriété ${gsc.siteUrl} — la flèche verte signale une position qui remonte`}
              >
                <KeywordTable rows={gsc.queries} />
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-3 mt-3">
              <Card title="Pages qui rapportent des clics" subtitle="Résultats de recherche">
                <Table
                  head={["Page", "Clics", "Impressions", "Taux de clic", "Position"]}
                  rows={gsc.pages.map((row) => [
                    <PageCell key="p" path={row.page.replace(/^https?:\/\/[^/]+/, "") || "/"} title={row.page} />,
                    num(row.clicks),
                    num(row.impressions),
                    pct(row.ctr),
                    row.position.toFixed(1),
                  ])}
                />
              </Card>
              <div className="grid gap-3">
                <Card title="Pays" subtitle="Clics dans les résultats de recherche">
                  <BarList rows={gsc.countries.map((c) => ({ label: countryLabel(c.country), value: c.clicks }))} />
                </Card>
                <Card title="Appareils" subtitle="Clics dans les résultats de recherche">
                  <BarList rows={gsc.devices.map((d) => ({ label: deviceLabel(d.device), value: d.clicks }))} />
                </Card>
              </div>
            </div>
          </>
        ) : (
          <NotConnected
            title="Search Console n'est pas encore reliée au tableau de bord"
            why="C'est la seule source des mots-clés et des positions : Analytics ne sait pas sur quelles requêtes le site ressort. Il faut une propriété Search Console pour bien-microdose.com (de préférence de type domaine) et un accès en lecture pour l'application."
            steps={[
              "Suivre les étapes 1 à 5 du bloc Analytics ci-dessus (le même compte de service sert aux deux).",
              "Dans <strong>Search Console</strong> → Paramètres → Utilisateurs et autorisations → Ajouter un utilisateur : l'adresse du compte de service, autorisation <strong>Complète</strong>.",
              `Propriété interrogée : <code>${gscSiteUrl() || "non déterminée"}</code>. Si la propriété validée est différente (préfixe d'URL plutôt que domaine), renseigner <code>GSC_SITE_URL</code> dans Vercel.`,
              `État actuel : compte de service ${isGscConfigured() ? "lu correctement, mais l'API n'a rien renvoyé — vérifier l'autorisation dans Search Console" : "<strong>absent ou illisible</strong>"}.`,
            ]}
          />
        )}

        {/* Deux mesures se recoupent ici, et l'écart entre elles est normal :
            Analytics ne voit que les visiteurs qui acceptent les cookies, la base
            voit toutes les commandes payées. Les nommer distinctement évite de
            prendre l'une pour l'autre. */}
        <p className="mt-10 text-[12px] text-[#818a97] max-w-3xl leading-relaxed">
          Le chiffre d&apos;affaires vient des commandes payées enregistrées par le site : il est complet. Les visites et
          les ajouts au panier viennent d&apos;Analytics, qui ne compte que les visiteurs ayant accepté les cookies
          {commerce
            ? ` : ${num(commerce.addToCarts)} ajouts au panier sur la période, dont ${num(commerce.checkouts)} passage${
                commerce.checkouts > 1 ? "s" : ""
              } à la commande.`
            : "."}
          {" "}Le taux de conversion rapproche ces deux sources : il est donc surestimé.
        </p>

        <footer className="mt-12 pt-6 border-t border-black/[0.08] text-[11px] text-[#8c94a1]">
          SEO by Clickzou — compteur temps réel toutes les 20 secondes, tableaux rechargés toutes les 5 minutes,
          sans aucune mise en cache.
          {" "}Période de comparaison : du {longDate(period.previous.start)} au {longDate(period.previous.end)}.
        </footer>
      </main>
    </div>
  );
}
