/**
 * Briques d'affichage du tableau de bord « SEO by Clickzou ».
 *
 * Composants serveur, sans dépendance de graphes : les courbes sont du SVG
 * calculé ici même. Une bibliothèque de charts pèserait plus lourd que tout le
 * reste de la page pour deux tracés, et le rendu serveur évite le clignotement
 * au chargement.
 *
 * Palette claire, alignée sur le site public : fond blanc, cartes cerclées de
 * gris, texte navy de la marque. Les couleurs d'accent (ciel, rose) sont
 * assombries par rapport à la charte, qui est calibrée pour du fond sombre.
 */
import type { ReactNode } from "react";

import { getArticle } from "@/lib/content";
import { nf1, num } from "./format";
import { pageLabel } from "./labels";

/* ------------------------------------------------------------------ format */

/* Le formatage vit dans `format.ts`, sans dépendance : le graphique, devenu un
   composant client, en a besoin lui aussi et ne peut pas importer ce fichier —
   il embarquerait le catalogue du blog dans le bundle du navigateur. On le
   réexporte ici pour que les appelants gardent un point d'entrée unique. */
export { duration, longDate, money, num, pct, shortDate } from "./format";
export { LineChart, type Series } from "./line-chart";

/* -------------------------------------------------------------- conteneurs */

export function Card({
  title,
  subtitle,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl bg-white ring-1 ring-black/[0.07] shadow-[0_1px_2px_rgba(0,17,43,0.05)] p-5 sm:p-6 ${className}`}>
      {title && (
        <header className="mb-4">
          <h2 className="text-[15px] font-semibold text-[#00112b] tracking-tight">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-[#77808e]">{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-10 mb-4">
      <h2 className="text-lg font-semibold text-[#00112b] tracking-tight">{children}</h2>
      {hint && <p className="text-xs text-[#818a97]">{hint}</p>}
    </div>
  );
}

/* --------------------------------------------------------------------- KPI */

/* Les tuiles de chiffres sont sur un aplat bleu ciel dilué : c'est ce qui les
   distingue des cartes blanches (graphes, listes, tableaux) sur un fond devenu
   blanc lui aussi. Le bandeau temps réel, lui, est rose — voir `realtime.tsx`. */

/** Variation affichée à côté d'un chiffre. `invert` pour les métriques où
 *  baisser est bon (taux de rebond, position moyenne dans Google). */
export function Delta({ value, invert = false }: { value: number | null; invert?: boolean }) {
  if (value === null || !Number.isFinite(value)) {
    return <span className="text-[11px] text-[#6d8ba1]">aucun chiffre sur la période précédente</span>;
  }
  const good = invert ? value < 0 : value > 0;
  const flat = Math.abs(value) < 0.5;
  const color = flat ? "text-[#6d8ba1]" : good ? "text-emerald-600" : "text-rose-600";
  const sign = value > 0 ? "+" : "";
  return (
    <span className={`text-[11px] font-medium ${color}`}>
      {sign}
      {nf1.format(value)} % vs période précédente
    </span>
  );
}

export function Kpi({
  label,
  value,
  delta,
  invert,
  hint,
  note,
}: {
  label: string;
  value: string;
  delta?: number | null;
  invert?: boolean;
  hint?: string;
  /** Précision toujours affichée, sous l'évolution : ce que le chiffre compte vraiment. */
  note?: string;
}) {
  return (
    <div className="rounded-xl bg-[#eaf5fc] ring-1 ring-sky/45 px-4 py-3.5">
      <p className="text-[11px] uppercase tracking-[0.12em] text-[#3f6c88]">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold text-[#00112b] tabular-nums tracking-tight">{value}</p>
      <div className="mt-1">{delta !== undefined ? <Delta value={delta} invert={invert} /> : hint ? <span className="text-[11px] text-[#6d8ba1]">{hint}</span> : null}</div>
      {note && <p className="mt-1 text-[11px] leading-snug text-[#6d8ba1]">{note}</p>}
    </div>
  );
}

/* ------------------------------------------------------------- nom de page */

/**
 * Une page dans un tableau : son nom en clair, son chemin en dessous.
 *
 * Google ne renvoie que des chemins (`/fr/product/peace-in-the-chaos`, `/en`, `/`). Lus tels
 * quels, trois lignes d'accueil dans des langues différentes se ressemblent
 * toutes ; le nom lisible porte l'information, le chemin reste là pour vérifier.
 */
export function PageCell({ path, title }: { path: string; title?: string }) {
  const { label, lang, path: clean, section, slug } = pageLabel(path);

  // Le blog est le seul cas où le vrai titre est connu du site sans appel
  // réseau : autant l'afficher plutôt qu'un slug remis en forme. La lecture se
  // fait ici, dans un composant serveur, et non dans `labels.ts` — importer le
  // catalogue d'articles depuis un module qu'un composant client pourrait un
  // jour utiliser embarquerait tout le blog dans le bundle du navigateur.
  const article = section === "learn" && slug ? getArticle(slug) : undefined;
  const articleLang = lang ? (lang.toLowerCase() as "fr" | "en" | "de" | "nl") : "fr";
  const display = article ? `Article — ${article.i18n[articleLang]?.title ?? article.i18n.en.title}` : label;
  return (
    <span className="block max-w-[420px]" title={title || clean}>
      <span className="flex items-center gap-1.5">
        <span className="truncate text-[#00112b]">{display}</span>
        {lang && (
          <span className="shrink-0 rounded px-1 py-px text-[10px] font-medium tracking-wide text-[#3f6c88] bg-sky/25">
            {lang}
          </span>
        )}
      </span>
      <span className="block truncate text-[11px] text-[#98a0ac]">{clean}</span>
    </span>
  );
}

/* ------------------------------------------------------------- listes/tables */

export function BarList({ rows, unit = "" }: { rows: { label: string; value: number; extra?: string }[]; unit?: string }) {
  if (!rows.length) return <Empty />;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="relative rounded-lg overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-sky/30" style={{ width: `${(r.value / max) * 100}%` }} />
          <div className="relative flex items-center justify-between gap-3 px-3 py-2">
            <span className="text-[13px] text-[#243348] truncate">{r.label || "(non défini)"}</span>
            <span className="text-[13px] font-medium text-[#00112b] tabular-nums shrink-0">
              {num(r.value)}
              {unit && <span className="text-[#818a97] text-[11px] ml-1">{unit}</span>}
              {r.extra && <span className="text-[#818a97] text-[11px] ml-2">{r.extra}</span>}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  if (!rows.length) return <Empty />;
  return (
    <div className="overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
      <table className="w-full min-w-[560px] text-[13px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-[#818a97]">
            {head.map((h, i) => (
              <th key={h} className={`pb-2 font-medium ${i === 0 ? "" : "text-right"}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[0.06]">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-black/[0.02]">
              {row.map((cell, j) => (
                <td key={j} className={`py-2 ${j === 0 ? "text-[#243348] max-w-[420px]" : "text-right text-[#00112b] tabular-nums whitespace-nowrap"}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Empty({ children = "Aucune donnée sur cette période." }: { children?: ReactNode }) {
  return <p className="text-sm text-[#818a97] py-6 text-center">{children}</p>;
}

/* ------------------------------------------------- sources non configurées */

/** Carte affichée à la place d'un bloc dont la source n'est pas connectée.
 *  On préfère un mode d'emploi à des chiffres de démonstration : un tableau de
 *  bord qui invente des données est pire qu'un tableau de bord vide. */
export function NotConnected({ title, why, steps }: { title: string; why: string; steps: string[] }) {
  return (
    <Card className="border-dashed">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 h-2 w-2 rounded-full bg-amber-500 shrink-0" />
        <div>
          <h3 className="text-[15px] font-semibold text-[#00112b]">{title}</h3>
          <p className="mt-1 text-sm text-[#5a6472] max-w-2xl">{why}</p>
          <ol className="mt-3 space-y-1.5 text-[13px] text-[#465269] list-decimal pl-4 max-w-2xl">
            {steps.map((s) => (
              <li key={s} dangerouslySetInnerHTML={{ __html: s }} />
            ))}
          </ol>
        </div>
      </div>
    </Card>
  );
}

export function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-[#5a6472]">
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-amber-500"}`} />
      {label}
    </span>
  );
}
