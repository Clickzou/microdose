import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/dictionaries";
import { hasLocale, href } from "@/lib/i18n";
import { supabaseAdmin } from "@/lib/supabase";
import ClearCartOnSuccess from "@/components/clear-cart";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Page de retour après paiement. Le statut affiché vient de la base (mise à jour par
 * le callback CardGate) ; le paramètre `s` de l'URL ne sert qu'en attendant ce
 * callback, et ne peut jamais faire passer une commande pour payée.
 */
export default async function OrderPage({ params, searchParams }: PageProps<"/[lang]/order/[token]">) {
  const { lang, token } = await params;
  const { s } = await searchParams;
  if (!hasLocale(lang) || !UUID.test(token)) notFound();
  const t = await getDictionary(lang);

  const db = supabaseAdmin();
  const { data: order } = db
    ? await db.from("orders").select("number, status").eq("public_token", token).maybeSingle()
    : { data: null };
  if (!order) notFound();

  const state =
    order.status === "paid" || order.status === "shipped"
      ? "success"
      : order.status === "failed" || order.status === "cancelled" || s === "failure"
        ? "failure"
        : "pending";

  const copy = {
    success: [t.order.successTitle, t.order.successText],
    pending: [t.order.pendingTitle, t.order.pendingText],
    failure: [t.order.failureTitle, t.order.failureText],
  }[state];

  return (
    <section className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
      {state !== "failure" ? <ClearCartOnSuccess /> : null}
      <h1 className="text-5xl">{copy[0]}</h1>
      <p className="mt-6 text-lg text-ink-soft">{copy[1]}</p>
      <p className="mt-8 text-sm text-muted">
        {t.order.reference}
        <br />
        <span className="font-semibold text-ink">BM{order.number}</span>
      </p>
      <Link href={href(lang, state === "failure" ? "/cart" : "/")} className="mt-10 inline-flex rounded-full bg-ink px-7 py-3.5 font-medium text-paper">
        {state === "failure" ? t.order.retry : t.notFound.cta}
      </Link>
    </section>
  );
}
