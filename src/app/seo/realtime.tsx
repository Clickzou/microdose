"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Bandeau « en ce moment » + rafraîchissement automatique du reste de la page.
 *
 * Deux rythmes, parce que les données n'ont pas la même fraîcheur :
 *   — le compteur temps réel repart toutes les 20 secondes sur son propre
 *     endpoint (`/api/seo/realtime`), qui ne coûte qu'un rapport Analytics ;
 *   — les tableaux de la page, eux, sont rechargés toutes les 5 minutes via
 *     `router.refresh()`. Les consolider plus souvent ne changerait rien :
 *     Analytics agrège à l'heure, Search Console avec deux jours de retard.
 *
 * Seule carte rose du tableau de bord : c'est le seul bloc qui bouge tout seul,
 * la couleur sert de repère pour le retrouver d'un coup d'œil.
 *
 * L'onglet mis en arrière-plan suspend les deux : inutile de tirer sur les
 * quotas d'API pour un écran que personne ne regarde. Le retour au premier plan
 * relance une lecture immédiate.
 */
const REALTIME_MS = 20_000;
const PAGE_REFRESH_MS = 5 * 60_000;

type Realtime = {
  configured: boolean;
  error?: string;
  activeUsers?: number;
  perMinute?: number[];
  pages?: { label: string; users: number }[];
  devices?: { label: string; users: number }[];
  countries?: { label: string; users: number }[];
};

export default function RealtimePanel({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [data, setData] = useState<Realtime | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [live, setLive] = useState(true);
  const [ago, setAgo] = useState(0);
  // Initialise a 0 et non a Date.now() : lire l horloge pendant le rendu est un
  // effet de bord, que React 19 refuse. La valeur est posee au premier tick.
  const lastPageRefresh = useRef(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/seo/realtime", { cache: "no-store" });
      if (res.status === 401) {
        router.refresh(); // session expirée : on retombe sur l'écran de connexion
        return;
      }
      setData((await res.json()) as Realtime);
      setUpdatedAt(new Date());
      setAgo(0);
    } catch {
      /* réseau instable : on retentera au tick suivant */
    }
  }, [router]);

  useEffect(() => {
    if (!enabled || !live) return;
    // Les lectures passent toutes par le planificateur (timeout/interval) : appeler
    // load() directement dans l'effet reviendrait a poser un setState pendant le
    // rendu, ce que React 19 signale a juste titre.
    const first = setTimeout(load, 0);
    if (lastPageRefresh.current === 0) lastPageRefresh.current = Date.now();
    const timer = setInterval(() => {
      if (document.hidden) return;
      void load();
      if (Date.now() - lastPageRefresh.current > PAGE_REFRESH_MS) {
        lastPageRefresh.current = Date.now();
        router.refresh();
      }
    }, REALTIME_MS);
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, live, load, router]);

  // Compteur « il y a N s », purement décoratif mais c'est lui qui prouve, d'un
  // coup d'œil, que l'écran n'est pas figé.
  useEffect(() => {
    const t = setInterval(() => setAgo((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (!enabled) return null;

  const users = data?.activeUsers ?? 0;
  const minutes = data?.perMinute ?? [];
  const max = Math.max(...minutes, 1);

  return (
    <section className="rounded-2xl bg-[#fdeef4] ring-1 ring-blush/70 shadow-[0_1px_2px_rgba(0,17,43,0.05)] p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="relative flex h-2.5 w-2.5">
          {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />}
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${live ? "bg-emerald-500" : "bg-black/20"}`} />
        </span>
        <h2 className="text-[15px] font-semibold text-[#00112b] tracking-tight">En ce moment sur le site</h2>
        <span className="text-[11px] text-[#818a97]">
          {updatedAt ? `actualisé il y a ${ago} s` : "lecture en cours…"} · toutes les 20 s
        </span>
        <div className="ml-auto flex gap-1">
          <button
            type="button"
            onClick={() => load()}
            className="rounded-full px-3 py-1.5 text-[12px] bg-white/70 text-[#7a4a60] hover:text-[#00112b] transition"
          >
            Actualiser
          </button>
          <button
            type="button"
            onClick={() => setLive((v) => !v)}
            className="rounded-full px-3 py-1.5 text-[12px] bg-white/70 text-[#7a4a60] hover:text-[#00112b] transition"
          >
            {live ? "Mettre en pause" : "Reprendre"}
          </button>
        </div>
      </div>

      {data && !data.configured ? (
        <p className="mt-4 text-sm text-[#77808e]">Analytics n&apos;est pas encore relié : le compteur temps réel s&apos;allumera en même temps que le reste.</p>
      ) : data?.error ? (
        <p className="mt-4 text-sm text-[#77808e]">Analytics n&apos;a pas répondu à la dernière lecture. Nouvelle tentative dans quelques secondes.</p>
      ) : (
        <div className="mt-4 grid gap-5 lg:grid-cols-[auto_1fr_1fr]">
          <div>
            <p className="text-5xl font-semibold text-[#00112b] tabular-nums leading-none">{users}</p>
            <p className="mt-1.5 text-[11px] text-[#77808e]">
              visiteur{users > 1 ? "s" : ""} actif{users > 1 ? "s" : ""}
              <br />
              (30 dernières minutes)
            </p>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#9a6580] mb-2">Minute par minute</p>
            <div className="flex items-end gap-[3px] h-16">
              {minutes.map((v, i) => (
                <div
                  key={i}
                  title={`il y a ${29 - i} min : ${v}`}
                  className="flex-1 rounded-sm bg-[#d4568e]/70 min-h-[2px]"
                  style={{ height: `${Math.max(4, (v / max) * 100)}%` }}
                />
              ))}
              {!minutes.length && <p className="text-sm text-[#98a0ac]">Aucun visiteur sur les trente dernières minutes.</p>}
            </div>
            <div className="flex justify-between text-[10px] text-[#98a0ac] mt-1">
              <span>il y a 30 min</span>
              <span>maintenant</span>
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#9a6580] mb-2">Pages consultées</p>
            {data?.pages?.length ? (
              <ul className="space-y-1">
                {data.pages.slice(0, 5).map((p) => (
                  <li key={p.label} className="flex justify-between gap-3 text-[13px]">
                    <span className="text-[#33415a] truncate">{p.label || "(sans titre)"}</span>
                    <span className="text-[#00112b] tabular-nums shrink-0">{p.users}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#98a0ac]">—</p>
            )}
            {!!data?.countries?.length && (
              <p className="mt-3 text-[11px] text-[#818a97]">
                {data.countries.slice(0, 3).map((c) => `${c.label} (${c.users})`).join(" · ")}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
