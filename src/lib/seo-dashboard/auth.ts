/**
 * Accès au tableau de bord « SEO by Clickzou » (/seo).
 *
 * Authentification volontairement minimale — un seul compte, pas de base de
 * données — mais vérifiée **côté serveur** : le mot de passe ne part jamais
 * dans le bundle client, et le cookie de session ne contient qu'une signature,
 * pas les identifiants.
 *
 * Différence avec bien.health : le dépôt de ce site est public. Aucune empreinte
 * du mot de passe n'y est donc écrite (elle permettrait de le chercher hors
 * ligne, et c'est le même que celui de bien.health). Le mot de passe vit
 * uniquement dans Vercel : `SEO_DASHBOARD_PASSWORD`. Sans lui, personne ne peut
 * se connecter — le tableau de bord reste fermé plutôt qu'ouvert par défaut.
 */
import { createHmac, createHash, timingSafeEqual } from "node:crypto";

export const SEO_COOKIE = "clickzou_seo";
/** Durée d'une session : une journée de travail, à refaire le lendemain. */
export const SESSION_MAX_AGE = 60 * 60 * 12;

const USER = process.env.SEO_DASHBOARD_USER || "carla07stats";

/**
 * Clé de signature des sessions. Dérivée du mot de passe faute de secret dédié :
 * changer le mot de passe invalide donc automatiquement les sessions en cours.
 */
function sessionSecret(): string | null {
  return process.env.SEO_DASHBOARD_SECRET || process.env.SEO_DASHBOARD_PASSWORD || null;
}

/** Comparaison à temps constant, sur des empreintes de longueur fixe : deux
 *  chaînes de tailles différentes feraient lever `timingSafeEqual`. */
function sameSecret(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a.normalize("NFC")).digest();
  const hb = createHash("sha256").update(b.normalize("NFC")).digest();
  return timingSafeEqual(ha, hb);
}

export function isAuthConfigured(): boolean {
  return Boolean(process.env.SEO_DASHBOARD_PASSWORD);
}

export function checkCredentials(user: string, password: string): boolean {
  const expected = process.env.SEO_DASHBOARD_PASSWORD;
  if (!expected) return false;
  // Les deux comparaisons sont faites dans tous les cas : ne pas révéler par le
  // temps de réponse lequel des deux champs est faux.
  const userOk = sameSecret(user.trim(), USER);
  const passOk = sameSecret(password, expected);
  return userOk && passOk;
}

/** Jeton de session : date d'expiration + HMAC de cette date. Rien d'autre —
 *  il n'y a qu'un compte, il n'y a donc pas d'identité à transporter. */
export function createSession(): string {
  const secret = sessionSecret();
  if (!secret) throw new Error("SEO_DASHBOARD_PASSWORD absent");
  const exp = Date.now() + SESSION_MAX_AGE * 1000;
  const sig = createHmac("sha256", secret).update(String(exp)).digest("hex");
  return `${exp}.${sig}`;
}

export function isValidSession(token: string | undefined): boolean {
  const secret = sessionSecret();
  if (!token || !secret) return false;
  const [expRaw, sig] = token.split(".");
  const exp = Number(expRaw);
  if (!exp || !sig || Number.isNaN(exp) || exp < Date.now()) return false;
  const expected = createHmac("sha256", secret).update(String(exp)).digest("hex");
  return sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
