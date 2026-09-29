import "server-only";
import { getDictionary } from "@/dictionaries";
import { hasLocale, type Locale } from "@/lib/i18n";
import type { PricedLine } from "@/lib/catalog";

/**
 * E-mails de commande, envoyés par l'API Resend quand une commande passe à « paid » :
 * une confirmation au client (dans sa langue) et une notification à BIEN (en anglais).
 *
 * Variables : RESEND_API_KEY et EMAIL_FROM (adresse d'un domaine validé dans Resend).
 * ORDER_NOTIFY_EMAIL et EMAIL_REPLY_TO valent info@bien.health par défaut.
 * Sans clé ni expéditeur, rien n'est envoyé : le paiement n'en dépend jamais.
 */

export type PaidOrder = {
  number: number;
  lang: string;
  email: string;
  phone: string | null;
  first_name: string;
  last_name: string;
  address1: string;
  address2: string | null;
  zip: string;
  city: string;
  country: string;
  items: PricedLine[];
  subtotal_cents: number;
  discount_cents: number;
  coupon_code: string | null;
  coupon_cents: number;
  shipping_cents: number;
  total_cents: number;
  newsletter_opt_in: boolean;
  paid_at: string | null;
  payment_transaction: string | null;
};

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const money = (cents: number, lang: string) =>
  new Intl.NumberFormat(lang, { style: "currency", currency: "EUR" }).format(cents / 100);

const countryName = (code: string, lang: string) => new Intl.DisplayNames([lang], { type: "region" }).of(code) ?? code;

async function send(msg: { to: string; subject: string; html: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.warn("email: RESEND_API_KEY ou EMAIL_FROM absent, e-mail non envoyé :", msg.subject);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, reply_to: process.env.EMAIL_REPLY_TO || "info@bien.health", ...msg }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

function addressLines(o: PaidOrder, lang: string): string[] {
  return [
    `${o.first_name} ${o.last_name}`,
    o.address1,
    o.address2,
    `${o.zip} ${o.city}`,
    countryName(o.country, lang),
  ].filter((l): l is string => Boolean(l));
}

async function customerEmail(o: PaidOrder) {
  const lang: Locale = hasLocale(o.lang) ? o.lang : "en";
  const d = await getDictionary(lang);
  const t = d.email;
  const ref = `BM${o.number}`;
  const rows: [string, string][] = [
    ...o.items.map((l): [string, string] => [`${d.products[l.slug]?.name ?? l.slug} × ${l.qty}`, money(l.unitCents * l.qty, lang)]),
    ...(o.discount_cents > 0 ? [[t.discount, `− ${money(o.discount_cents, lang)}`] as [string, string]] : []),
    ...(o.coupon_code && o.coupon_cents > 0
      ? [[t.coupon.replace("{code}", o.coupon_code), `− ${money(o.coupon_cents, lang)}`] as [string, string]]
      : []),
    [t.shipping, o.shipping_cents === 0 ? t.free : money(o.shipping_cents, lang)],
  ];
  const address = addressLines(o, lang);
  const hello = t.hello.replace("{name}", o.first_name);
  // Typographie française : espace avant les deux-points.
  const colon = lang === "fr" ? " : " : ": ";

  const text = [
    hello,
    "",
    t.intro,
    "",
    `${t.summary} — ${ref}`,
    ...rows.map(([a, b]) => `${a}${colon}${b}`),
    `${t.total}${colon}${money(o.total_cents, lang)}`,
    "",
    t.address,
    ...address,
    "",
    t.nextTitle,
    ...t.next.map((n) => `- ${n}`),
    "",
    t.questions,
    "",
    t.signature,
  ].join("\n");

  const td = 'style="padding:6px 0;border-bottom:1px solid #eee"';
  const html = `<!doctype html><html lang="${lang}"><body style="margin:0;background:#f6f4f1;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;background:#fff">
<p style="font-size:22px;font-weight:bold;letter-spacing:1px;margin:0 0 24px">BIEN</p>
<p>${esc(hello)}</p>
<p>${esc(t.intro)}</p>
<h2 style="font-size:16px;margin:28px 0 8px">${esc(t.summary)} — ${ref}</h2>
<table style="width:100%;border-collapse:collapse;font-size:14px">
${rows.map(([a, b]) => `<tr><td ${td}>${esc(a)}</td><td ${td} align="right">${esc(b)}</td></tr>`).join("\n")}
<tr><td style="padding:10px 0;font-weight:bold">${esc(t.total)}</td><td style="padding:10px 0;font-weight:bold" align="right">${esc(money(o.total_cents, lang))}</td></tr>
</table>
<h2 style="font-size:16px;margin:28px 0 8px">${esc(t.address)}</h2>
<p style="font-size:14px;line-height:1.5">${address.map(esc).join("<br>")}</p>
<h2 style="font-size:16px;margin:28px 0 8px">${esc(t.nextTitle)}</h2>
<ul style="font-size:14px;line-height:1.5;padding-left:20px">${t.next.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
<p style="font-size:14px">${esc(t.questions)}</p>
<p style="font-size:14px">${esc(t.signature)}</p>
</div></body></html>`;

  await send({ to: o.email, subject: t.subject.replace("{number}", ref), html, text });
}

async function notifyBien(o: PaidOrder) {
  const ref = `BM${o.number}`;
  const d = await getDictionary("en");
  const lines = [
    `New paid order ${ref} — ${money(o.total_cents, "en")}`,
    "",
    ...o.items.map((l) => `${l.qty} × ${d.products[l.slug]?.name ?? l.slug} (${money(l.totalCents, "en")})`),
    o.discount_cents > 0 ? `Volume discount: −${money(o.discount_cents, "en")}` : null,
    o.coupon_code && o.coupon_cents > 0 ? `Code ${o.coupon_code}: −${money(o.coupon_cents, "en")}` : null,
    `Shipping: ${money(o.shipping_cents, "en")}`,
    `Total paid: ${money(o.total_cents, "en")}`,
    "",
    "Customer",
    `${o.first_name} ${o.last_name}`,
    o.email,
    o.phone,
    `Language: ${o.lang.toUpperCase()} · Newsletter: ${o.newsletter_opt_in ? "yes" : "no"}`,
    "",
    "Ship to",
    ...addressLines(o, "en"),
    "",
    `Paid at: ${o.paid_at ?? "-"} · CardGate transaction: ${o.payment_transaction ?? "-"}`,
    "",
    "To do: ship the package.",
  ].filter((l): l is string => l !== null);

  const text = lines.join("\n");
  await send({
    to: process.env.ORDER_NOTIFY_EMAIL || "info@bien.health",
    subject: `New order ${ref} — ${o.first_name} ${o.last_name} — ${money(o.total_cents, "en")}`,
    text,
    html: `<pre style="font-family:Arial,Helvetica,sans-serif;font-size:14px;white-space:pre-wrap">${esc(text)}</pre>`,
  });
}

/** Envoie les deux e-mails ; une erreur sur l'un n'empêche pas l'autre. */
export async function sendOrderEmails(o: PaidOrder) {
  const results = await Promise.allSettled([customerEmail(o), notifyBien(o)]);
  for (const r of results) if (r.status === "rejected") console.error("email: commande", o.number, r.reason);
}
