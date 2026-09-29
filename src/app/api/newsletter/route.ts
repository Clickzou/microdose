import { NextResponse, after } from "next/server";
import { hasLocale } from "@/lib/i18n";
import { supabaseAdmin } from "@/lib/supabase";
import { EMAIL_RE, clientIp, rateLimited } from "@/lib/request";
import { subscribeToKlaviyo } from "@/lib/klaviyo";

export async function POST(req: Request) {
  if (rateLimited(`nl:${clientIp(req)}`, 5, 10 * 60_000)) return NextResponse.json({ ok: false }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  // Pot de miel rempli : on répond comme si tout allait bien, sans rien enregistrer.
  if (body.website) return NextResponse.json({ ok: true });
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 200) return NextResponse.json({ ok: false }, { status: 400 });

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ ok: false }, { status: 503 });
  const lang = hasLocale(String(body.lang)) ? String(body.lang) : "en";
  const { error } = await db
    .from("newsletter_subscribers")
    .upsert({ email, lang, source: "site", unsubscribed_at: null }, { onConflict: "email" });
  if (error) {
    console.error("newsletter", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  // Klaviyo après la réponse : le visiteur n’attend pas l’outil d’envoi, et un échec ne perd pas l’inscription.
  after(() => subscribeToKlaviyo(email, lang, "site").catch((e) => console.error("newsletter: Klaviyo", e)));
  return NextResponse.json({ ok: true });
}
