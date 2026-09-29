/**
 * Authentification Google pour les API Analytics Data et Search Console.
 *
 * Flux « JWT bearer » d'un compte de service : on signe soi-même un jeton avec
 * la clé privée du compte, Google le troque contre un access token. C'est le
 * seul flux qui marche sans intervention humaine (pas d'écran de consentement),
 * donc le seul utilisable pour un tableau de bord qui se rafraîchit tout seul.
 *
 * Aucune dépendance ajoutée : `googleapis` pèse plusieurs dizaines de mégas
 * pour ce que `node:crypto` fait en trente lignes.
 *
 * Configuration attendue (Vercel ou .env.local) :
 *   GOOGLE_SERVICE_ACCOUNT_JSON  le JSON de la clé du compte de service, brut
 *                                ou encodé en base64 (plus commode à coller
 *                                dans Vercel : pas de retours à la ligne).
 */
import { createSign } from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

export type ServiceAccount = { client_email: string; private_key: string };

let cachedAccount: ServiceAccount | null | undefined;

export function serviceAccount(): ServiceAccount | null {
  if (cachedAccount !== undefined) return cachedAccount;

  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return (cachedAccount = null);

  try {
    const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(json) as ServiceAccount;
    if (!parsed.client_email || !parsed.private_key) return (cachedAccount = null);
    // Les clés collées dans une variable d'environnement arrivent souvent avec
    // des « \n » littéraux : sans cette remise en forme, la signature échoue.
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    return (cachedAccount = parsed);
  } catch {
    return (cachedAccount = null);
  }
}

export function isGoogleConfigured(): boolean {
  return serviceAccount() !== null;
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Un access token par jeu de scopes, gardé en mémoire jusqu'à son expiration
 *  (une heure côté Google, on reprend une marge de trente secondes). */
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

export async function accessToken(scopes: string[]): Promise<string | null> {
  const account = serviceAccount();
  if (!account) return null;

  const key = scopes.join(" ");
  const cached = tokenCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const iat = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: key,
      aud: TOKEN_URL,
      iat,
      exp: iat + 3600,
    }),
  );

  let assertion: string;
  try {
    const signature = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(account.private_key);
    assertion = `${header}.${claims}.${base64url(signature)}`;
  } catch {
    return null; // clé privée illisible : la carte concernée affichera « non connectée »
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;

  tokenCache.set(key, {
    token: data.access_token,
    expiresAt: Date.now() + Math.max(60, (data.expires_in ?? 3600) - 30) * 1000,
  });
  return data.access_token;
}

/** Appel JSON authentifié. Renvoie `null` plutôt que de lever : une source
 *  indisponible ne doit jamais faire tomber le tableau de bord entier. */
export async function googleFetch<T>(url: string, scopes: string[], body: unknown): Promise<T | null> {
  const token = await accessToken(scopes);
  if (!token) return null;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
