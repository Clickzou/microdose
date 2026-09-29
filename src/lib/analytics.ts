import { priceLine, products, type CartLine } from "./catalog";

/**
 * Évènements e-commerce envoyés à GA4, lus par le tableau de bord `/seo`
 * (métriques `addToCarts` et `checkouts`).
 *
 * `gtag` n'existe que si le visiteur a accepté les cookies et que
 * NEXT_PUBLIC_GA_ID est renseigné (voir `components/consent.tsx`) : sans lui,
 * l'appel ne fait rien. Aucune file d'attente : un évènement antérieur au
 * consentement n'a pas à être envoyé après coup.
 */
type Gtag = (command: "event", name: string, params: Record<string, unknown>) => void;

export function trackCart(event: "add_to_cart" | "begin_checkout", lines: CartLine[]) {
  const gtag = typeof window === "undefined" ? undefined : (window as unknown as { gtag?: Gtag }).gtag;
  if (!gtag || !lines.length) return;
  const priced = lines.map(priceLine);
  gtag("event", event, {
    currency: "EUR",
    value: priced.reduce((s, l) => s + l.totalCents, 0) / 100,
    items: priced.map((l) => ({
      item_id: products[l.slug].sku,
      item_name: l.slug,
      price: l.unitCents / 100,
      quantity: l.qty,
    })),
  });
}
