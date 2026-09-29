import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SEO_COOKIE } from "@/lib/seo-dashboard/auth";

/** Déconnexion du tableau de bord. Répond par une redirection : le bouton est
 *  un simple formulaire, il fonctionne donc même sans JavaScript. */
export async function POST(request: Request) {
  (await cookies()).delete(SEO_COOKIE);
  return NextResponse.redirect(new URL("/seo", request.url), { status: 303 });
}
