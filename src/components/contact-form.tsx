"use client";

import { useState } from "react";
import type { Dictionary } from "@/dictionaries/en";
import type { Locale } from "@/lib/i18n";

const input = "w-full rounded-2xl border border-ink/15 bg-white px-4 py-3.5 outline-none transition focus:border-ink";

export default function ContactForm({ lang, t }: { lang: Locale; t: Dictionary["contact"] }) {
  const [state, setState] = useState<"idle" | "sending" | "ok" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang, ...Object.fromEntries(f) }),
      });
      setState(res.ok ? "ok" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "ok") return <p className="rounded-[2rem] bg-coffret-soft p-8 text-lg">{t.success}</p>;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <input className={input} name="name" required autoComplete="name" placeholder={t.name} aria-label={t.name} />
        <input className={input} name="email" type="email" required autoComplete="email" placeholder={t.email} aria-label={t.email} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <input className={input} name="phone" type="tel" required minLength={6} maxLength={30} autoComplete="tel" placeholder={t.phone} aria-label={t.phone} />
        <select className={input} name="subject" required aria-label={t.subject} defaultValue={t.subjects[0]}>
          {t.subjects.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <textarea className={`${input} min-h-44`} name="message" required maxLength={5000} placeholder={t.message} aria-label={t.message} />
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {state === "error" ? (
        <p role="alert" className="text-sm">
          {t.error}
        </p>
      ) : null}
      <button type="submit" disabled={state === "sending"} className="rounded-full bg-ink px-8 py-4 font-medium text-paper hover:bg-ink-soft disabled:opacity-60">
        {state === "sending" ? t.sending : t.send}
      </button>
    </form>
  );
}
