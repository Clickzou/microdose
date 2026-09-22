import { NextResponse } from "next/server";
import { computeTotals, products, type CartLine } from "@/lib/catalog";
import { hasLocale } from "@/lib/i18n";
import { supabaseAdmin } from "@/lib/supabase";
import { cardgateConfig, createPayment, CG_ITEM, type CardGateCartItem } from "@/lib/cardgate";
import { EMAIL_RE, clientIp, rateLimited, siteOrigin } from "@/lib/request";

/** Version des CGV acceptée, conservée avec la preuve de consentement. */
const TERMS_VERSION = "2026-09-22";

type Body = {
  lang?: string;
  lines?: CartLine[];
  customer?: Record<string, string>;
  ageConfirmed?: boolean;
  legalConfirmed?: boolean;
  newsletter?: boolean;
};

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (rateLimited(`checkout:${ip}`, 10, 10 * 60_000)) return fail("server", 429);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return fail("server");
  }

  const lang = body.lang && hasLocale(body.lang) ? body.lang : "en";
  const c = body.customer ?? {};
  const required = ["email", "firstName", "lastName", "address1", "zip", "city", "country"];
  if (required.some((k) => !c[k] || c[k].length > 200)) return fail("required");
  if (!EMAIL_RE.test(c.email)) return fail("email");

  // Prix, remises et frais de port recalculés ici : ceux du navigateur sont ignorés.
  const totals = computeTotals(Array.isArray(body.lines) ? body.lines : [], c.country);
  if (totals.lines.length === 0) return fail("server");
  if (totals.shippingCents === null || totals.totalCents === null) return fail("country");
  if (totals.restricted && body.ageConfirmed !== true) return fail("age");
  if (body.legalConfirmed !== true) return fail("legal");

  const db = supabaseAdmin();
  const cg = cardgateConfig();
  if (!db || !cg) {
    console.error("checkout: Supabase ou CardGate non configuré");
    return fail("server", 503);
  }

  const now = new Date().toISOString();
  const { data: order, error } = await db
    .from("orders")
    .insert({
      lang,
      email: c.email.toLowerCase(),
      phone: c.phone || null,
      first_name: c.firstName,
      last_name: c.lastName,
      address1: c.address1,
      address2: c.address2 || null,
      zip: c.zip,
      city: c.city,
      country: c.country,
      items: totals.lines,
      subtotal_cents: totals.subtotalCents,
      discount_cents: totals.discountCents,
      shipping_cents: totals.shippingCents,
      total_cents: totals.totalCents,
      age_confirmed_at: body.ageConfirmed ? now : null,
      legal_confirmed_at: now,
      consent_ip: ip,
      consent_user_agent: req.headers.get("user-agent")?.slice(0, 400) ?? null,
      terms_version: TERMS_VERSION,
      newsletter_opt_in: Boolean(body.newsletter),
    })
    .select("id, number, public_token")
    .single();

  if (error || !order) {
    console.error("checkout: insertion commande", error);
    return fail("server", 500);
  }

  // Lignes CardGate : prix unitaire TTC. La remise de volume est une ligne à part,
  // pour que la somme des lignes égale exactement le montant facturé.
  const items: CardGateCartItem[] = totals.lines.map((l) => ({
    type: CG_ITEM.product,
    sku: products[l.slug].sku,
    name: l.slug,
    quantity: l.qty,
    price: l.unitCents,
    vat: 21,
    vat_inc: 1,
  }));
  if (totals.discountCents > 0) {
    items.push({ type: CG_ITEM.discount, sku: "VOLUME", name: "Volume discount", quantity: 1, price: -totals.discountCents, vat: 21, vat_inc: 1 });
  }
  if (totals.shippingCents > 0) {
    items.push({ type: CG_ITEM.shipping, sku: "SHIPPING", name: "Shipping", quantity: 1, price: totals.shippingCents, vat: 21, vat_inc: 1 });
  }

  const origin = siteOrigin(req);
  const ret = (state: string) => `${origin}/${lang}/order/${order.public_token}?s=${state}`;

  try {
    const payment = await createPayment(cg, {
      amountCents: totals.totalCents,
      reference: `BM${order.number}`,
      description: `BIEN order ${order.number}`,
      email: c.email,
      phone: c.phone,
      country: c.country,
      language: lang,
      ip,
      consumer: {
        firstname: c.firstName,
        lastname: c.lastName,
        address: [c.address1, c.address2].filter(Boolean).join(", "),
        zipcode: c.zip,
        city: c.city,
        country_id: c.country,
      },
      items,
      urls: {
        success: ret("success"),
        failure: ret("failure"),
        pending: ret("pending"),
        callback: `${origin}/api/cardgate/callback`,
      },
    });
    await db.from("orders").update({ payment_transaction: payment.transaction }).eq("id", order.id);

    if (body.newsletter) {
      await db.from("newsletter_subscribers").upsert({ email: c.email.toLowerCase(), lang, source: "checkout" }, { onConflict: "email", ignoreDuplicates: true });
    }
    return NextResponse.json({ redirect: payment.url });
  } catch (e) {
    console.error("checkout: CardGate", e);
    await db.from("orders").update({ status: "failed" }).eq("id", order.id);
    return fail("server", 502);
  }
}
