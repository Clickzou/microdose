import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

/**
 * Racine autonome du tableau de bord.
 *
 * `/seo` vit hors du segment `[lang]` : pas d'en-tête, pas de pied de page, pas
 * de contrôle d'âge ni de bannière cookies, et surtout **pas d'Analytics** — un
 * outil de mesure qui se mesure lui-même fausse les chiffres qu'il affiche.
 *
 * Ce fichier est donc un second layout racine (il porte `<html>` et `<body>`),
 * le premier étant celui du site public dans `[lang]/layout.tsx`.
 */
const body = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "SEO by Clickzou — bien-microdose.com",
  // Outil interne : jamais indexé, jamais suivi par un robot, même si l'URL fuit.
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function SeoLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${body.variable} h-full`}>
      <body className="min-h-full bg-white text-[#00112b] antialiased font-sans">{children}</body>
    </html>
  );
}
