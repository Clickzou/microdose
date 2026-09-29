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

export type Article = {
  slug: string;
  date: string;
  updated: string;
  image: string;
  category: "basics" | "protocols" | "science" | "everyday";
  readingMinutes: number;
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

/**
 * Articles publiés. Ceux dont la relecture de conformité n'est pas faite
 * (compliance.status = "review") ne sont servis qu'en local ou en préproduction,
 * jamais en production — sauf si PUBLISH_REVIEW_ARTICLES=true.
 */
export function getArticles(): Article[] {
  const dir = path.join(CONTENT_DIR, "blog");
  if (!fs.existsSync(dir)) return [];
  const showReview =
    process.env.PUBLISH_REVIEW_ARTICLES === "true" || (process.env.VERCEL_ENV ?? "development") !== "production";
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson<Article>(path.join(dir, f)))
    .filter((a) => showReview || a.compliance?.status === "ok")
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getArticle(slug: string): Article | undefined {
  return getArticles().find((a) => a.slug === slug);
}

export function getLegal(name: "terms" | "privacy"): LegalPage | undefined {
  const file = path.join(CONTENT_DIR, "legal", `${name}.json`);
  return fs.existsSync(file) ? readJson<LegalPage>(file) : undefined;
}

const marked = new Marked({ gfm: true, breaks: false });

/** Markdown → HTML. Le contenu vient uniquement du dépôt : pas d'entrée utilisateur. */
export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false }) as string;
}
