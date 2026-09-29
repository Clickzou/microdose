"use client";

import { useSyncExternalStore } from "react";
import { isProductSlug, products, type CartLine, type ProductSlug } from "./catalog";
import { trackCart } from "./analytics";

/**
 * Panier conservé dans le navigateur (localStorage). Il ne contient que des
 * identifiants et des quantités : les prix sont toujours recalculés, et le serveur
 * refait le calcul complet à la création de la commande.
 */

const KEY = "bm_cart_v1";
const EMPTY: CartLine[] = [];
let cache: CartLine[] | null = null;
const listeners = new Set<() => void>();

function read(): CartLine[] {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(raw)
      ? raw.filter((l): l is CartLine => l && isProductSlug(l.slug) && Number.isInteger(l.qty) && l.qty > 0)
      : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(lines: CartLine[]) {
  cache = lines;
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* navigation privée : le panier vit le temps de la session */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function addToCart(slug: ProductSlug, qty: number) {
  const lines = [...read()];
  const i = lines.findIndex((l) => l.slug === slug);
  const max = products[slug].maxQty;
  if (i >= 0) lines[i] = { slug, qty: Math.min(lines[i].qty + qty, max) };
  else lines.push({ slug, qty: Math.min(qty, max) });
  write(lines);
  trackCart("add_to_cart", [{ slug, qty: Math.min(qty, max) }]);
}

export function setQty(slug: ProductSlug, qty: number) {
  const max = products[slug].maxQty;
  write(
    read()
      .map((l) => (l.slug === slug ? { slug, qty: Math.min(Math.max(qty, 0), max) } : l))
      .filter((l) => l.qty > 0),
  );
}

export function clearCart() {
  write([]);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((s, l) => s + l.qty, 0);
}
