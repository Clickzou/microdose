import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendOrderEmails, type PaidOrder } from "@/lib/email";
import { cardgateConfig, stateFromCode, verifyCallback, type CallbackData } from "@/lib/cardgate";

/**
 * Notification serveur à serveur de CardGate, après chaque transaction.
 *
 * C'est la SEULE source de vérité du paiement : l'URL de retour du navigateur peut
 * être rejouée ou falsifiée, elle n'est utilisée que pour l'affichage.
 * CardGate attend en réponse « transaction.code » (comportement du plugin officiel).
 */
async function readData(req: Request): Promise<CallbackData> {
  const url = new URL(req.url);
  const data: CallbackData = Object.fromEntries(url.searchParams);
  if (req.method === "POST") {
    const type = req.headers.get("content-type") ?? "";
    if (type.includes("application/json")) Object.assign(data, await req.json());
    else Object.assign(data, Object.fromEntries(new URLSearchParams(await req.text())));
  }
  return data;
}

async function handle(req: Request) {
  const cfg = cardgateConfig();
  const db = supabaseAdmin();
  if (!cfg || !db) return new Response("not configured", { status: 503 });

  const d = await readData(req);
  const valid = verifyCallback(cfg, d);
  const number = Number(String(d.reference ?? "").replace(/^BM/, ""));
  const code = Number(d.code);

  const { data: order } = Number.isFinite(number)
    ? await db.from("orders").select("id, status, total_cents").eq("number", number).maybeSingle()
    : { data: null };

  await db.from("payment_events").insert({
    order_id: order?.id ?? null,
    transaction: d.transaction ?? null,
    code: Number.isFinite(code) ? code : null,
    valid_hash: valid,
    payload: d,
  });

  if (!valid) return new Response("HashCheck failed.", { status: 400 });
  if (!order) return new Response("unknown order", { status: 404 });
  if (Number(d.amount) !== order.total_cents || d.currency !== "EUR") {
    return new Response("amount mismatch", { status: 400 });
  }

  // Une commande payée ne revient jamais en arrière sur un callback tardif.
  if (["paid", "shipped", "refunded"].includes(order.status)) {
    return new Response("payment already processed");
  }

  const state = stateFromCode(code);
  if (state === "paid") {
    // Mise à jour conditionnelle : si deux callbacks arrivent en même temps, un seul
    // obtient la ligne en retour, et les e-mails ne partent qu'une fois.
    const { data: paid } = await db
      .from("orders")
      .update({ status: "paid", paid_at: new Date().toISOString(), payment_transaction: d.transaction, payment_code: code })
      .eq("id", order.id)
      .not("status", "in", "(paid,shipped,refunded)")
      .select()
      .maybeSingle();
    if (paid) after(() => sendOrderEmails(paid as PaidOrder));
  } else if (state === "failed") {
    await db.from("orders").update({ status: "failed", payment_code: code }).eq("id", order.id);
  } else {
    await db.from("orders").update({ payment_code: code }).eq("id", order.id);
  }

  return new Response(`${d.transaction}.${d.code}`);
}

export const POST = handle;
export const GET = handle;
