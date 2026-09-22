import { NextResponse } from "next/server";
import { hasLocale } from "@/lib/i18n";
import { supabaseAdmin } from "@/lib/supabase";
import { EMAIL_RE, clientIp, rateLimited } from "@/lib/request";

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (rateLimited(`contact:${ip}`, 5, 10 * 60_000)) return NextResponse.json({ ok: false }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  if (b.website) return NextResponse.json({ ok: true });

  const name = String(b.name ?? "").trim().slice(0, 120);
  const email = String(b.email ?? "").trim().toLowerCase();
  const subject = String(b.subject ?? "").trim().slice(0, 120);
  const message = String(b.message ?? "").trim();
  if (!name || !EMAIL_RE.test(email) || message.length < 2 || message.length > 5000) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ ok: false }, { status: 503 });
  const { error } = await db.from("contact_messages").insert({
    lang: hasLocale(String(b.lang)) ? String(b.lang) : "en",
    name,
    email,
    subject,
    message,
    ip,
  });
  if (error) {
    console.error("contact", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
