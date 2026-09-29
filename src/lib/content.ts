import "server-only";
import fs from "node:fs";
import path from "node:path";
import { Marked } from "marked";
import type { Locale } from "./i18n";

/**
 * Contenus éditoriaux versionnés dans le dépôt (src/content), en JSON quadrilingue.
 *
 * Choix assumé : le blog n'a plus été alimenté depuis juillet 2024 et chaque texte
 * doit passer une relecture juridique avant publication. Un contenu dans Git, relu
 * en pull request, laisse une trace de qui a validé quoi — ce qu'une base éditable
 * en ligne ne garantit pas.
 */

const CONTENT_DIR = path.join(process.cwd(), "src", "content");

type LocalizedText = { title: string; excerpt?: string; description: string; body: string };

/** Catégories du blog = les 5 silos du master SEO. `safety` et `research` n'affichent jamais d'appel à l'achat. */
export const CATEGORIES = ["basics", "protocols", "truffles", "safety", "research"] as const;
export type Category = (typeof CATEGORIES)[number];
export const NO_CTA_CATEGORIES: readonly Category[] = ["safety", "research"];

export function isCategory(v: string): v is Category {
  return (CATEGORIES as readonly string[]).includes(v);
}

export type Article = {
  slug: string;
  date: string;
  updated: string;
  image: string;
  category: Category;
  readingMinutes: number;
  /**
   * Date de parution programmée (YYYY-MM-DD, heure de Paris). Avant cette date,
   * l'article est un brouillon : absent du blog, du sitemap et des liens. Les pages
   * concernées se régénèrent toutes les heures (`revalidate`), la parution se fait
   * donc seule, sans redéploiement.
   */
  publishAt?: string;
  /** `noCta` : pas d'appel à l'achat sous l'article, même publié (sujet proche d'une allégation). */
  compliance: { status: "ok" | "review"; notes: string; noCta?: boolean };
  i18n: Record<Locale, Required<LocalizedText>>;
};

export type LegalPage = {
  updated: string;
  i18n: Record<Locale, LocalizedText>;
};

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

/** Jour courant à Paris, au format YYYY-MM-DD (le serveur Vercel est en UTC). */
function parisToday(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date());
}

/**
 * Brouillons visibles hors production (local, préproduction) : c'est là qu'on relit
 * les articles programmés avant leur parution.
 */
const SHOW_DRAFTS = (process.env.VERCEL_ENV ?? "development") !== "production";

function readAllArticles(): Article[] {
  const dir = path.join(CONTENT_DIR, "blog");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson<Article>(path.join(dir, f)));
}

/** Un article est en ligne s'il a passé la relecture et que sa date de parution est atteinte. */
export function isPublished(a: Article): boolean {
  if (SHOW_DRAFTS) return true;
  const reviewed = a.compliance?.status === "ok" || process.env.PUBLISH_REVIEW_ARTICLES === "true";
  return reviewed && (!a.publishAt || a.publishAt <= parisToday());
}

/** Articles en ligne, le plus récent en premier. */
export function getArticles(): Article[] {
  return readAllArticles()
    .filter(isPublished)
    .sort((a, b) => (b.publishAt ?? b.date).localeCompare(a.publishAt ?? a.date));
}

export function getArticle(slug: string): Article | undefined {
  return getArticles().find((a) => a.slug === slug);
}

export function getLegal(name: "terms" | "privacy"): LegalPage | undefined {
  const file = path.join(CONTENT_DIR, "legal", `${name}.json`);
  return fs.existsSync(file) ? readJson<LegalPage>(file) : undefined;
}

const marked = new Marked({ gfm: true, breaks: false });

/**
 * Markdown → HTML. Le contenu vient uniquement du dépôt : pas d'entrée utilisateur.
 *
 * Maillage interne auto-adaptatif : dans un article, `[texte](article:slug)` devient
 * un lien vers `/{lang}/learn/slug` seulement si cet article est en ligne ; sinon le
 * texte reste, sans lien. Un article programmé peut donc être cité partout dès
 * aujourd'hui : les liens s'allument d'eux-mêmes le jour de sa parution.
 * Les liens externes s'ouvrent dans un nouvel onglet.
 */
export function renderMarkdown(md: string, lang?: Locale): string {
  let src = md;
  if (lang) {
    const live = new Set(getArticles().map((a) => a.slug));
    src = src.replace(/\[([^\]]+)\]\(article:([a-z0-9-]+)\)/g, (_, label: string, slug: string) =>
      live.has(slug) ? `[${label}](/${lang}/learn/${slug})` : label,
    );
  }
  const html = marked.parse(src, { async: false }) as string;
  return html.replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener noreferrer"');
}
