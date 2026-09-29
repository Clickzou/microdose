import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { checkCredentials, createSession, SEO_COOKIE, SESSION_MAX_AGE } from "@/lib/seo-dashboard/auth";

/**
 * Connexion au tableau de bord /seo.
 *
 * Limitation de débit volontairement rustique : un compteur en mémoire par IP.
 * Il ne survit pas à un redémarrage de l'instance et ne se partage pas entre
 * régions, mais il suffit à rendre une attaque par dictionnaire impraticable
 * sur un endpoint qui, par ailleurs, ne sert qu'à une personne.
 */
const attempts = new Map<string, { count: number; until: number }>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 8;

function tooManyAttempts(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.until < now) {
    attempts.set(ip, { count: 1, until: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (tooManyAttempts(ip)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let user = "";
  let password = "";
  try {
    const body = await request.json();
    user = String(body.user ?? "");
    password = String(body.password ?? "");
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!checkCredentials(user, password)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  (await cookies()).set(SEO_COOKIE, createSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  attempts.delete(ip);
  return NextResponse.json({ ok: true });
}
