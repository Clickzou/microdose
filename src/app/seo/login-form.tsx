"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Écran d'entrée du tableau de bord. Le formulaire ne fait que transmettre la
 * saisie : la vérification est entièrement côté serveur (`/api/seo/login`), et
 * le mot de passe n'existe nulle part dans le JavaScript envoyé au navigateur.
 */
export default function LoginForm() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/seo/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, password }),
      });
      if (res.ok) {
        router.refresh();
        return;
      }
      setError(res.status === 429 ? "Trop de tentatives. Réessayez dans une minute." : "Identifiant ou mot de passe incorrect.");
    } catch {
      setError("Connexion impossible. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center px-4 bg-[#f6f7f9]">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white ring-1 ring-black/[0.07] shadow-[0_10px_30px_rgba(0,17,43,0.08)] p-7">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#1379b0]">Clickzou</p>
        <h1 className="mt-1 text-2xl font-semibold text-[#00112b] tracking-tight">SEO by Clickzou</h1>
        <p className="mt-1.5 text-sm text-[#6b7482]">Tableau de bord de performance — bien-microdose.com</p>

        <label className="block mt-6 text-[13px] text-[#5a6472]" htmlFor="seo-user">
          Identifiant
        </label>
        <input
          id="seo-user"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          autoComplete="username"
          autoFocus
          className="mt-1 w-full rounded-lg bg-white ring-1 ring-black/15 focus:ring-[#1379b0] outline-none px-3 py-2.5 text-[15px] text-[#00112b]"
        />

        <label className="block mt-4 text-[13px] text-[#5a6472]" htmlFor="seo-pass">
          Mot de passe
        </label>
        <input
          id="seo-pass"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="mt-1 w-full rounded-lg bg-white ring-1 ring-black/15 focus:ring-[#1379b0] outline-none px-3 py-2.5 text-[15px] text-[#00112b]"
        />

        {error && <p className="mt-3 text-[13px] text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={busy || !user || !password}
          className="mt-6 w-full rounded-lg bg-sky text-ink font-semibold py-2.5 hover:brightness-105 disabled:opacity-50 transition"
        >
          {busy ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </main>
  );
}
