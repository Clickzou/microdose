"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
import type { Dictionary } from "@/dictionaries/en";
import { href, type Locale } from "@/lib/i18n";

/**
 * Bandeau cookies + Google Analytics conditionné au consentement.
 *
 * Aucun traceur n'est chargé avant un « Accepter » explicite. Le choix est gardé
 * 6 mois (recommandation CNIL / AP néerlandaise). GA n'est chargé que si
 * NEXT_PUBLIC_GA_ID est défini : le flux de mesure est distinct de celui de
 * bien.health (audit, constat 08 — le conteneur GTM était partagé).
 */
const KEY = "bm_consent";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function Consent({ lang, t }: { lang: Locale; t: Dictionary["cookies"] }) {
  const [choice, setChoice] = useState<"unknown" | "granted" | "denied" | "loading">("loading");

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(KEY);
    } catch {}
    const [value, ts] = (stored ?? "").split(":");
    const fresh = Number(ts) > Date.now() - 1000 * 60 * 60 * 24 * 182;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChoice(fresh && (value === "granted" || value === "denied") ? value : "unknown");
  }, []);

  const decide = (value: "granted" | "denied") => {
    try {
      localStorage.setItem(KEY, `${value}:${Date.now()}`);
    } catch {}
    setChoice(value);
  };

  return (
    <>
      {choice === "granted" && GA_ID ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}',{anonymize_ip:true});`}
          </Script>
        </>
      ) : null}
      {choice === "unknown" ? (
        <div className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-2xl rounded-3xl bg-ink p-5 text-paper shadow-soft sm:inset-x-6 sm:bottom-6 sm:flex sm:items-center sm:gap-6">
          <p className="text-sm leading-relaxed text-paper/85">
            {t.text}{" "}
            <Link href={href(lang, "/privacy")} className="underline underline-offset-2">
              {t.more}
            </Link>
          </p>
          <div className="mt-4 flex shrink-0 gap-2 sm:mt-0">
            <button type="button" onClick={() => decide("denied")} className="rounded-full border border-paper/30 px-4 py-2 text-sm hover:border-paper">
              {t.refuse}
            </button>
            <button type="button" onClick={() => decide("granted")} className="rounded-full bg-paper px-4 py-2 text-sm font-medium text-ink">
              {t.accept}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
