import "server-only";

/**
 * Inscription newsletter dans Klaviyo, l'outil d'envoi de BIEN : compte Klaviyo de
 * bien.health, liste « EMAIL - Contacts optins Bien Microdose » (`SA6PgT`), où Carla a
 * regroupé en février 2026 les inscrits de l'ancien site.
 *
 * Variables : KLAVIYO_PRIVATE_KEY (clé privée, droits Listes / Profils /
 * Abonnements en écriture) et KLAVIYO_LIST_ID (`SA6PgT` par défaut). Klaviyo est la
 * liste de référence ; Supabase n'en garde qu'une copie de secours. Sans clé, rien
 * n'est envoyé et l'inscription reste seulement dans Supabase.
 */

const API = "https://a.klaviyo.com/api";
const REVISION = "2024-10-15";

function headers(key: string) {
  return {
    Authorization: `Klaviyo-API-Key ${key}`,
    revision: REVISION,
    "Content-Type": "application/vnd.api+json",
    Accept: "application/vnd.api+json",
  };
}

async function call(key: string, path: string, body: unknown) {
  const res = await fetch(`${API}${path}`, { method: "POST", headers: headers(key), body: JSON.stringify(body), cache: "no-store" });
  // 409 = le profil existe déjà : attendu pour un ancien inscrit, pas une erreur.
  if (!res.ok && res.status !== 409) throw new Error(`Klaviyo ${path} ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

/**
 * Abonne l'adresse à la liste (consentement e-mail marketing) et note sa langue,
 * pour pouvoir envoyer chaque newsletter dans la bonne langue.
 */
export async function subscribeToKlaviyo(email: string, lang: string, source: "site" | "checkout"): Promise<void> {
  const key = process.env.KLAVIYO_PRIVATE_KEY;
  if (!key) return;
  const list = process.env.KLAVIYO_LIST_ID || "SA6PgT";

  // 1. Profil : langue et provenance, en propriétés personnalisées.
  await call(key, "/profile-import", {
    data: { type: "profile", attributes: { email, properties: { language: lang, signup_source: source === "checkout" ? "bien-microdose.com checkout" : "bien-microdose.com" } } },
  });

  // 2. Abonnement à la liste. Si la liste est en double opt-in, Klaviyo envoie lui-même l'e-mail de confirmation.
  await call(key, "/profile-subscription-bulk-create-jobs", {
    data: {
      type: "profile-subscription-bulk-create-job",
      attributes: {
        custom_source: source === "checkout" ? "bien-microdose.com checkout" : "bien-microdose.com",
        profiles: { data: [{ type: "profile", attributes: { email, subscriptions: { email: { marketing: { consent: "SUBSCRIBED" } } } } }] },
      },
      relationships: { list: { data: { type: "list", id: list } } },
    },
  });
}
