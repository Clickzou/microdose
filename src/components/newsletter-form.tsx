"use client";

import { useState } from "react";
import type { Dictionary } from "@/dictionaries/en";
import type { Locale } from "@/lib/i18n";

export default function NewsletterForm({ lang, t, dark = false }: { lang: Locale; t: Dictionary["newsletter"]; dark?: boolean }) {
  const [state, setState] = useState<"idle" | "sending" | "ok" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setState("sending");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), lang, website: data.get("website") }),
      });
      setState(res.ok ? "ok" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "ok") return <p className={`mt-4 ${dark ? "text-paper" : "text-signal"}`}>{t.success}</p>;

  return (
    <form onSubmit={onSubmit} className="mt-4">
      <div className={`flex rounded-full p-1 ${dark ? "bg-paper/10" : "bg-paper shadow-soft"}`}>
        <label className="sr-only" htmlFor={`nl-email-${dark ? "d" : "l"}`}>
          {t.placeholder}
        </label>
        <input
          id={`nl-email-${dark ? "d" : "l"}`}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={t.placeholder}
          className={`min-w-0 flex-1 bg-transparent px-4 text-sm outline-none ${dark ? "placeholder:text-paper/50" : "placeholder:text-muted"}`}
        />
        {/* Pot de miel anti-robots : invisible pour un humain. */}
        <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
        <button
          type="submit"
          disabled={state === "sending"}
          className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-medium ${dark ? "bg-paper text-ink" : "bg-ink text-paper"} disabled:opacity-60`}
        >
          {t.submit}
        </button>
      </div>
      <p className={`mt-2 text-xs ${dark ? "text-paper/50" : "text-muted"}`}>{state === "error" ? t.error : t.consent}</p>
    </form>
  );
}
