"use client";

import { useEffect, useState } from "react";
import type { Dictionary } from "@/dictionaries/en";

/**
 * Contrôle d'âge à l'entrée (audit, point bloquant n° 2).
 *
 * Déclaratif : c'est le niveau attendu à l'entrée d'un site, la vraie preuve étant
 * la case obligatoire et horodatée du tunnel de commande. Le contenu reste dans le
 * HTML (indexable), le voile ne s'affiche qu'au premier passage, puis la réponse
 * est mémorisée 30 jours dans un cookie strictement nécessaire.
 */
const COOKIE = "bm_age";

export default function AgeGate({ t }: { t: Dictionary["ageGate"] }) {
  const [state, setState] = useState<"hidden" | "ask" | "refused">("hidden");

  useEffect(() => {
    if (!document.cookie.split("; ").some((c) => c === `${COOKIE}=1`)) {
      // Lecture du cookie après hydratation : le HTML serveur est identique pour tous.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState("ask");
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = state === "hidden" ? "" : "hidden";
  }, [state]);

  if (state === "hidden") return null;

  const accept = () => {
    document.cookie = `${COOKIE}=1; Max-Age=${60 * 60 * 24 * 30}; Path=/; SameSite=Lax; Secure`;
    setState("hidden");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-coffret p-4"
    >
      <div className="w-full max-w-md rounded-[2rem] bg-paper/85 p-8 text-center shadow-soft backdrop-blur-md sm:p-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-bien.svg" alt="BIEN" width={120} height={38} className="mx-auto h-9 w-auto" />
        {state === "ask" ? (
          <>
            <h2 id="age-title" className="mt-8 text-3xl">
              {t.title}
            </h2>
            <p className="mt-4 text-ink-soft">{t.body}</p>
            <div className="mt-8 flex flex-col gap-3">
              <button
                type="button"
                onClick={accept}
                autoFocus
                className="rounded-full bg-ink px-6 py-4 font-medium text-paper transition hover:bg-ink-soft"
              >
                {t.yes}
              </button>
              <button
                type="button"
                onClick={() => setState("refused")}
                className="rounded-full border border-ink/20 px-6 py-4 font-medium transition hover:border-ink"
              >
                {t.no}
              </button>
            </div>
            <p className="mt-6 text-xs text-muted">{t.legal}</p>
          </>
        ) : (
          <p id="age-title" className="mt-8 text-lg">
            {t.refused}
          </p>
        )}
      </div>
    </div>
  );
}
