import { NextResponse } from "next/server";
import { hasLocale } from "@/lib/i18n";
import { supabaseAdmin } from "@/lib/supabase";
import { EMAIL_RE, clientIp, rateLimited } from "@/lib/request";
import { sendContactNotification } from "@/lib/email";

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (rateLimited(`contact:${ip}`, 5, 10 * 60_000)) return NextResponse.json({ ok: false }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  if (b.website) return NextResponse.json({ ok: true });

  const name = String(b.name ?? "").trim().slice(0, 120);
  const email = String(b.email ?? "").trim().toLowerCase();
  const phone = String(b.phone ?? "").trim();
  const subject = String(b.subject ?? "").trim().slice(0, 120);
  const message = String(b.message ?? "").trim();
  if (!name || !EMAIL_RE.test(email) || !/^\+?[\d\s().\/-]{6,30}$/.test(phone) || !subject || message.length < 2 || message.length > 5000) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ ok: false }, { status: 503 });
  const lang = hasLocale(String(b.lang)) ? String(b.lang) : "en";
  const { error } = await db.from("contact_messages").insert({
    lang,
    name,
    email,
    phone,
    subject,
    message,
    ip,
  });
  if (error) {
    console.error("contact", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  // Le message est déjà en base : un échec d'envoi ne doit pas le faire passer pour perdu.
  await sendContactNotification({ lang, name, email, phone, subject, message }).catch((e) => console.error("contact: e-mail", e));
  return NextResponse.json({ ok: true });
}
