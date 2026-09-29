"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Choix d'une période à la carte : une journée précise, une quinzaine, un mois
 * clos, ou n'importe quel intervalle passé. Les raccourcis du bandeau restent
 * glissants (« les 28 derniers jours ») ; ce panneau sert à revenir en arrière.
 *
 * La navigation passe par l'URL (`/seo?start=…&end=…`) plutôt que par un état
 * local : la page est rendue côté serveur, et une période doit rester
 * partageable et rechargeable telle quelle.
 *
 * Les dates sont calculées en Europe/Paris, comme partout dans ce tableau de
 * bord, et seulement au clic — jamais pendant le rendu, sinon le serveur et le
 * navigateur pourraient ne pas être le même jour.
 */
const PARIS_DAY = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" });

function parisToday(): Date {
  return new Date(`${PARIS_DAY.format(new Date())}T00:00:00Z`);
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function shift(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

/** Libellé compact : « 12 août » ou « 1 – 15 août 2026 » selon les cas. */
const DAY_LABEL = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
function rangeLabel(start: string, end: string): string {
  const from = new Date(`${start}T00:00:00Z`);
  const to = new Date(`${end}T00:00:00Z`);
  if (start === end) return DAY_LABEL.format(from);
  return `${DAY_LABEL.format(from)} – ${DAY_LABEL.format(to)}`;
}

export default function DateRange({
  start,
  end,
  min,
  max,
  active,
}: {
  /** Dates de la période affichée, qui pré-remplissent les champs. */
  start: string;
  end: string;
  min: string;
  /** Hier : au-delà, Analytics et Search Console n'ont encore rien consolidé. */
  max: string;
  /** Vrai quand la période courante vient déjà de ce panneau. */
  active: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(start);
  const [to, setTo] = useState(end);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /** À l'ouverture, les champs repartent des dates réellement affichées :
   *  après un clic sur « 7 jours », rouvrir sur l'ancienne saisie serait
   *  déroutant. */
  function toggle() {
    if (!open) {
      setFrom(start);
      setTo(end);
    }
    setOpen((v) => !v);
  }

  function go(nextFrom: string, nextTo: string) {
    setOpen(false);
    router.push(`/seo?start=${nextFrom}&end=${nextTo}`);
  }

  function apply(e: React.FormEvent) {
    e.preventDefault();
    if (!from || !to) return;
    // Dates saisies à l'envers : on les remet dans l'ordre, comme le serveur.
    go(from <= to ? from : to, from <= to ? to : from);
  }

  /** Raccourcis calendaires — ceux que les raccourcis glissants ne couvrent pas. */
  function shortcut(kind: "yesterday" | "this-month" | "last-month") {
    const today = parisToday();
    if (kind === "yesterday") {
      const d = iso(shift(today, -1));
      return go(d, d);
    }
    if (kind === "this-month") {
      const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
      return go(iso(first), iso(shift(today, -1)));
    }
    const firstOfLast = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
    const lastOfLast = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
    return go(iso(firstOfLast), iso(lastOfLast));
  }

  const field =
    "rounded-lg border border-black/[0.12] bg-white px-2.5 py-1.5 text-[12px] text-[#00112b] " +
    "focus:outline-none focus:ring-2 focus:ring-sky/60";
  const chip =
    "rounded-full px-2.5 py-1 text-[11px] bg-black/[0.04] text-[#5a6472] hover:text-[#00112b] transition";

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => toggle()}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`rounded-full px-3.5 py-1.5 text-[12px] transition ${
          active ? "bg-sky text-ink font-semibold" : "bg-black/[0.04] text-[#5a6472] hover:text-[#00112b]"
        }`}
      >
        {active ? rangeLabel(start, end) : "Dates…"}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choisir une période"
          className="absolute right-0 z-30 mt-2 w-[19rem] rounded-xl border border-black/[0.08] bg-white p-3.5 shadow-xl"
        >
          <form onSubmit={apply}>
            <div className="flex items-end gap-2">
              <label className="flex-1">
                <span className="block text-[11px] text-[#77808e] mb-1">Du</span>
                <input
                  type="date"
                  value={from}
                  min={min}
                  max={max}
                  onChange={(e) => setFrom(e.target.value)}
                  className={`${field} w-full`}
                />
              </label>
              <label className="flex-1">
                <span className="block text-[11px] text-[#77808e] mb-1">Au</span>
                <input
                  type="date"
                  value={to}
                  min={min}
                  max={max}
                  onChange={(e) => setTo(e.target.value)}
                  className={`${field} w-full`}
                />
              </label>
            </div>

            <button
              type="submit"
              className="mt-3 w-full rounded-full bg-ink px-3.5 py-2 text-[12px] font-semibold text-white hover:opacity-90 transition"
            >
              Afficher cette période
            </button>
          </form>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <button type="button" className={chip} onClick={() => shortcut("yesterday")}>
              Hier
            </button>
            <button type="button" className={chip} onClick={() => shortcut("this-month")}>
              Ce mois-ci
            </button>
            <button type="button" className={chip} onClick={() => shortcut("last-month")}>
              Mois dernier
            </button>
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-[#8c94a1]">
            Les données s&apos;arrêtent à hier : Analytics et Search Console ne consolident pas la journée en cours.
            La période est comparée automatiquement à la même durée qui la précède.
          </p>
        </div>
      )}
    </div>
  );
}
