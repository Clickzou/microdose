/**
 * Catalogue et règles de prix — source unique, partagée par le navigateur (affichage,
 * panier) et le serveur (création de commande). Le serveur ne fait JAMAIS confiance
 * aux montants envoyés par le client : il recalcule tout à partir de ce fichier.
 *
 * Prix TTC en centimes (TVA néerlandaise incluse), repris de l'ancienne boutique
 * WooCommerce (sauvegarde du 02/09/2026).
 */

export type ProductSlug = "peace-in-the-chaos" | "bien-totebag";

export type Product = {
  slug: ProductSlug;
  sku: string;
  priceCents: number;
  /** Nombre de microdoses dans un pack (affiche le prix par dose). */
  doses?: number;
  /** Remise par quantité : `percent` % dès `minQty` unités du même produit. */
  volumeDiscount?: { minQty: number; percent: number };
  /** Produit soumis au contrôle d'âge et aux restrictions d'usage. */
  restricted: boolean;
  images: string[];
  maxQty: number;
};

export const products: Record<ProductSlug, Product> = {
  "peace-in-the-chaos": {
    slug: "peace-in-the-chaos",
    sku: "BIEN-PEACE-6",
    priceCents: 4999,
    doses: 6,
    volumeDiscount: { minQty: 2, percent: 10 },
    restricted: true,
    images: [
      "/images/box-standing.webp",
      "/images/box-open.webp",
      "/images/hand-truffles.webp",
      "/images/leaflet.webp",
      "/images/box-open-2.webp",
    ],
    maxQty: 8,
  },
  "bien-totebag": {
    slug: "bien-totebag",
    sku: "BIEN-TOTE",
    priceCents: 1999,
    restricted: false,
    images: ["/images/tote-1.webp", "/images/tote-life.webp", "/images/tote-2.webp", "/images/tote-3.webp"],
    maxQty: 5,
  },
};

export const productList = Object.values(products);

export function isProductSlug(value: string): value is ProductSlug {
  // hasOwn et non `in` : « constructor » ou « toString » passeraient le test `in`.
  return Object.hasOwn(products, value);
}

export type CartLine = { slug: ProductSlug; qty: number };

export type PricedLine = CartLine & {
  unitCents: number;
  discountCents: number;
  totalCents: number;
};

export function priceLine(line: CartLine): PricedLine {
  const p = products[line.slug];
  const gross = p.priceCents * line.qty;
  const vd = p.volumeDiscount;
  const discountCents = vd && line.qty >= vd.minQty ? Math.round((gross * vd.percent) / 100) : 0;
  return { ...line, unitCents: p.priceCents, discountCents, totalCents: gross - discountCents };
}

/**
 * Zones de livraison reprises telles quelles de WooCommerce (sauvegarde du
 * 02/09/2026). Tarifs TTC, livraison offerte dès 100 € d'achat.
 *
 * ⚠ Les pays ouverts à la livraison relèvent d'une décision juridique (statut de
 * la psilocybine selon le pays — cf. audit, point bloquant n° 3). La liste
 * effectivement ouverte se règle par la variable NEXT_PUBLIC_SHIPPING_COUNTRIES, sans toucher
 * au code.
 */
export const shippingZones: Record<string, number> = {
  NL: 395,
  BE: 595,
  DE: 595,
  FR: 695,
  LU: 695,
  IT: 995,
  PT: 995,
  ES: 995,
};

export const FREE_SHIPPING_FROM_CENTS = 10000;

export function enabledCountries(): string[] {
  const raw = process.env.NEXT_PUBLIC_SHIPPING_COUNTRIES;
  const all = Object.keys(shippingZones);
  if (!raw) return all;
  return raw
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter((c) => all.includes(c));
}

export function shippingFor(country: string, subtotalCents: number): number | null {
  const cost = shippingZones[country];
  if (cost === undefined || !enabledCountries().includes(country)) return null;
  return subtotalCents >= FREE_SHIPPING_FROM_CENTS ? 0 : cost;
}

export type Totals = {
  lines: PricedLine[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number | null;
  totalCents: number | null;
  restricted: boolean;
};

export function computeTotals(lines: CartLine[], country?: string): Totals {
  const priced = lines
    .filter((l) => isProductSlug(l.slug) && Number.isInteger(l.qty) && l.qty > 0)
    .map((l) => priceLine({ slug: l.slug, qty: Math.min(l.qty, products[l.slug].maxQty) }));
  const subtotalCents = priced.reduce((s, l) => s + l.totalCents, 0);
  const discountCents = priced.reduce((s, l) => s + l.discountCents, 0);
  const shippingCents = country ? shippingFor(country, subtotalCents) : null;
  return {
    lines: priced,
    subtotalCents,
    discountCents,
    shippingCents,
    totalCents: shippingCents === null ? null : subtotalCents + shippingCents,
    restricted: priced.some((l) => products[l.slug].restricted),
  };
}
