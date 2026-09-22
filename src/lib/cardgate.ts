import "server-only";
import { createHash } from "node:crypto";

/**
 * Passerelle CardGate (API REST « Curo »).
 *
 * Aucune documentation publique n'est plus en ligne (la page CURO renvoie « outdated ») :
 * ce client reproduit à l'identique le comportement du plugin officiel CardGate pour
 * WooCommerce, tel qu'il tournait sur l'ancien site (sauvegarde du 02/09/2026,
 * wp-content/plugins/cardgate/cardgate-clientlib-php) :
 *
 *  - POST {base}payment/ en JSON, authentification HTTP Basic merchant_id:api_key
 *  - réponse { payment: { transaction, action: "redirect", url } }
 *  - callback serveur à serveur avec transaction, currency, amount, reference, code,
 *    status, hash ; hash = md5([TEST] + transaction + currency + amount + reference
 *    + code + site_key)
 *  - codes : 0/100 en attente, 200-299 payé, 300-399 échec, 700-799 en attente
 *    (virement)
 *
 * Sans `payment/{méthode}/`, CardGate affiche sa propre page de choix du moyen de
 * paiement : c'est le parcours le plus simple et il couvre toutes les méthodes
 * activées sur le compte marchand.
 */

const URL_PRODUCTION = "https://secure.curopayments.net/rest/v1/curo/";
const URL_STAGING = "https://secure-staging.curopayments.net/rest/v1/curo/";

export type CardGateConfig = {
  merchantId: string;
  apiKey: string;
  siteId: string;
  siteKey: string;
  testMode: boolean;
};

export function cardgateConfig(): CardGateConfig | null {
  const merchantId = process.env.CARDGATE_MERCHANT_ID;
  const apiKey = process.env.CARDGATE_API_KEY;
  const siteId = process.env.CARDGATE_SITE_ID;
  const siteKey = process.env.CARDGATE_SITE_KEY;
  if (!merchantId || !apiKey || !siteId || !siteKey) return null;
  return { merchantId, apiKey, siteId, siteKey, testMode: process.env.CARDGATE_TEST_MODE !== "false" };
}

/** Types de ligne de panier CardGate (Item::TYPE_*). */
export const CG_ITEM = { product: 1, shipping: 2, discount: 4 } as const;

export type CardGateCartItem = {
  type: number;
  sku: string;
  name: string;
  quantity: number;
  /** Prix unitaire TTC en centimes. */
  price: number;
  vat: number;
  vat_inc: 1;
};

export type CardGatePaymentRequest = {
  amountCents: number;
  reference: string;
  description: string;
  email: string;
  phone?: string;
  country: string;
  language: string;
  ip: string;
  consumer: {
    firstname: string;
    lastname: string;
    address: string;
    zipcode: string;
    city: string;
    country_id: string;
  };
  items: CardGateCartItem[];
  urls: { success: string; failure: string; pending: string; callback: string };
};

export async function createPayment(cfg: CardGateConfig, req: CardGatePaymentRequest): Promise<{ transaction: string; url: string }> {
  const body = {
    site_id: cfg.siteId,
    amount: req.amountCents,
    currency_id: "EUR",
    url_callback: req.urls.callback,
    url_success: req.urls.success,
    url_failure: req.urls.failure,
    url_pending: req.urls.pending,
    description: req.description,
    reference: req.reference,
    email: req.email,
    phone: req.phone || undefined,
    country_id: req.country,
    consumer: {
      ...req.consumer,
      // Adresse de livraison = adresse de facturation (préfixe shipto_ du client PHP).
      shipto_firstname: req.consumer.firstname,
      shipto_lastname: req.consumer.lastname,
      shipto_address: req.consumer.address,
      shipto_zipcode: req.consumer.zipcode,
      shipto_city: req.consumer.city,
      shipto_country_id: req.consumer.country_id,
    },
    cartitems: req.items,
    ip: req.ip,
    language_id: req.language,
  };

  const res = await fetch(`${cfg.testMode ? URL_STAGING : URL_PRODUCTION}payment/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${cfg.merchantId}:${cfg.apiKey}`).toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await res.text();
  let json: { payment?: { transaction?: string; action?: string; url?: string }; error?: { code?: string; message?: string } };
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`CardGate: réponse non JSON (${res.status})`);
  }
  if (json.error) throw new Error(`CardGate ${json.error.code ?? ""}: ${json.error.message ?? "erreur"}`);
  const p = json.payment;
  if (!p?.transaction || p.action !== "redirect" || !p.url) {
    throw new Error(`CardGate: réponse inattendue (${res.status})`);
  }
  return { transaction: p.transaction, url: p.url };
}

export type CallbackData = Record<string, string>;

export function verifyCallback(cfg: CardGateConfig, d: CallbackData): boolean {
  for (const k of ["transaction", "currency", "amount", "reference", "code", "hash"]) {
    if (d[k] === undefined) return false;
  }
  const prefix = d.testmode && d.testmode !== "0" ? "TEST" : "";
  const expected = createHash("md5")
    .update(prefix + d.transaction + d.currency + d.amount + d.reference + d.code + cfg.siteKey)
    .digest("hex");
  // Comparaison à temps constant : la longueur est fixe (32 caractères hexadécimaux).
  if (expected.length !== d.hash.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ d.hash.charCodeAt(i);
  return diff === 0;
}

export type PaymentState = "paid" | "pending" | "failed";

export function stateFromCode(code: number): PaymentState {
  if (code >= 200 && code < 300) return "paid";
  if (code >= 300 && code < 400) return "failed";
  return "pending";
}
