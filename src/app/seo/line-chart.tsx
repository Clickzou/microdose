"use client";

import { useCallback, useRef, useState } from "react";

import { num, shortDate, weekdayDate } from "./format";

/**
 * Courbe multi-séries, avec lecture des valeurs au survol.
 *
 * Toujours pas de bibliothèque de graphes : le tracé reste du SVG calculé ici,
 * et l'interaction tient en une poignée de lignes. Une dépendance de charting
 * pèserait plus lourd que tout le reste de la page.
 *
 * Chaque série est normalisée sur sa propre échelle : superposer des sessions
 * (dizaines) et des commandes (unités) sur un axe commun écraserait la seconde
 * sur la ligne du bas. C'est aussi pourquoi l'infobulle est indispensable —
 * sans elle, la hauteur d'un point ne veut rien dire d'un tracé à l'autre.
 *
 * La légende sert d'interrupteur : quatre courbes superposées se gênent, et
 * n'en garder qu'une remet son échelle à l'aise sur toute la hauteur.
 */
export type Series = { label: string; color: string; points: number[] };

const WIDTH = 900;
const PAD = { top: 10, right: 8, bottom: 22, left: 8 };

export function LineChart({ labels, series, height = 160 }: { labels: string[]; series: Series[]; height?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  // Sur un écran tactile, il n'y a pas de survol : le premier appui fige la
  // lecture, l'appui suivant la relâche.
  const [pinned, setPinned] = useState(false);
  const [hidden, setHidden] = useState<string[]>([]);

  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const count = labels.length;

  const pointAt = useCallback(
    (clientX: number) => {
      const rect = box.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || count < 2) return null;
      // Le SVG occupe toute la largeur du conteneur : on repasse du pixel écran
      // à l'abscisse du viewBox avant de chercher le jour le plus proche.
      const x = ((clientX - rect.left) / rect.width) * WIDTH;
      const ratio = (x - PAD.left) / innerW;
      return Math.min(count - 1, Math.max(0, Math.round(ratio * (count - 1))));
    },
    [count, innerW],
  );

  if (count < 2) {
    return <p className="text-sm text-[#818a97] py-6 text-center">Pas assez de jours sur cette période pour tracer une courbe.</p>;
  }

  const x = (i: number) => PAD.left + (i / (count - 1)) * innerW;

  const shown = series.filter((s) => !hidden.includes(s.label));

  const paths = shown.map((s) => {
    const max = Math.max(...s.points, 1);
    const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
    const d = s.points.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    const area = `${d} L${x(count - 1).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${x(0).toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`;
    return { ...s, d, area, max, y };
  });

  // Quatre repères de date au maximum : au-delà, ils se chevauchent sur mobile.
  const ticks = [0, Math.floor((count - 1) / 3), Math.floor((2 * (count - 1)) / 3), count - 1].filter(
    (v, i, arr) => arr.indexOf(v) === i,
  );

  const tipLeft = active === null ? 0 : (x(active) / WIDTH) * 100;
  // L'infobulle se recentre sur le point, sauf aux deux bords où elle sortirait
  // du cadre : elle bascule alors du côté disponible.
  const tipShift = tipLeft < 18 ? "0" : tipLeft > 82 ? "-100%" : "-50%";

  return (
    <div>
      <div
        ref={box}
        className="relative"
        onPointerMove={(e) => {
          if (pinned) return;
          setActive(pointAt(e.clientX));
        }}
        onPointerLeave={() => {
          if (!pinned) setActive(null);
        }}
        onPointerDown={(e) => {
          const i = pointAt(e.clientX);
          // Un appui sur le même jour relâche la lecture figée.
          setPinned(!(pinned && i === active));
          setActive(i);
        }}
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${height}`}
          className="w-full touch-pan-y"
          role="img"
          aria-label={shown.map((s) => `${s.label} : maximum ${num(Math.max(...s.points, 0))}`).join(", ")}
        >
          {[0.25, 0.5, 0.75].map((r) => (
            <line
              key={r}
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={PAD.top + innerH * r}
              y2={PAD.top + innerH * r}
              stroke="rgba(0,17,43,0.09)"
              strokeWidth={1}
            />
          ))}

          {paths.map((p) => (
            <g key={p.label}>
              <path d={p.area} fill={p.color} opacity={0.12} />
              <path d={p.d} fill="none" stroke={p.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </g>
          ))}

          {active !== null && paths.length > 0 && (
            <g>
              <line
                x1={x(active)}
                x2={x(active)}
                y1={PAD.top}
                y2={PAD.top + innerH}
                stroke="rgba(0,17,43,0.35)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              {paths.map((p) => (
                <circle
                  key={p.label}
                  cx={x(active)}
                  cy={p.y(p.points[active] ?? 0)}
                  r={3.5}
                  fill="#ffffff"
                  stroke={p.color}
                  strokeWidth={2}
                />
              ))}
            </g>
          )}

          {ticks.map((i) => (
            <text
              key={i}
              x={x(i)}
              y={height - 6}
              textAnchor={i === 0 ? "start" : i === count - 1 ? "end" : "middle"}
              fontSize={11}
              fill="rgba(0,17,43,0.45)"
            >
              {shortDate(labels[i])}
            </text>
          ))}
        </svg>

        {active !== null && shown.length > 0 && (
          <div
            className="pointer-events-none absolute top-0 z-10 rounded-lg bg-white ring-1 ring-black/10 shadow-[0_6px_20px_rgba(0,17,43,0.12)] px-3 py-2 min-w-[9.5rem]"
            style={{ left: `${tipLeft}%`, transform: `translateX(${tipShift})` }}
          >
            <p className="text-[11px] font-medium text-[#465269] mb-1 whitespace-nowrap">{weekdayDate(labels[active])}</p>
            {shown.map((s) => (
              <p key={s.label} className="flex items-center gap-1.5 text-[12px] text-[#33415a] whitespace-nowrap">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: s.color }} />
                {s.label}
                <span className="ml-auto font-semibold text-[#00112b] tabular-nums">{num(s.points[active] ?? 0)}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-2">
        {series.map((s) => {
          const off = hidden.includes(s.label);
          const max = Math.max(...s.points, 0);
          return (
            <button
              key={s.label}
              type="button"
              aria-pressed={!off}
              onClick={() => {
                setHidden((prev) => (prev.includes(s.label) ? prev.filter((l) => l !== s.label) : [...prev, s.label]));
                setActive(null);
                setPinned(false);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] ring-1 transition ${
                off
                  ? "bg-transparent ring-black/[0.08] text-[#98a0ac]"
                  : "bg-black/[0.03] ring-black/[0.08] text-[#5a6472] hover:bg-black/[0.06]"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ background: off ? "transparent" : s.color, boxShadow: off ? `inset 0 0 0 1.5px ${s.color}` : undefined }}
              />
              <span className={off ? "line-through" : undefined}>{s.label}</span>
              <span className={off ? "text-[#b3b9c4]" : "text-[#8c94a1]"}>(max {num(max)})</span>
            </button>
          );
        })}
      </div>

      <p className="mt-1.5 text-[11px] text-[#8c94a1]">
        {shown.length === 0
          ? "Toutes les courbes sont masquées : cliquez sur une légende pour la réafficher."
          : "Cliquez une légende pour masquer ou réafficher sa courbe. Passez la souris sur le graphique pour lire les chiffres d’un jour, cliquez pour les figer."}
      </p>
    </div>
  );
}
