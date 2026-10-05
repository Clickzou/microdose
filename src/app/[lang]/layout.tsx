import type { Metadata, Viewport } from "next";
import { EB_Garamond } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { getDictionary } from "@/dictionaries";
import { hasLocale, locales } from "@/lib/i18n";
import { SITE_URL, pageMetadata } from "@/lib/seo";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import AgeGate from "@/components/age-gate";
import Consent from "@/components/consent";
import JsonLd from "@/components/json-ld";

// Polices de la charte d'origine (ancien site, demande de Carla du 05/10/2026) :
// EB Garamond pour les titres et les accents en italique, servie depuis le domaine du
// site par next/font. Moderat (texte) est déclarée dans globals.css, voir là-bas.
const display = EB_Garamond({ subsets: ["latin", "latin-ext"], variable: "--font-garamond", display: "swap", style: ["normal", "italic"] });

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const viewport: Viewport = { themeColor: "#f7f5f1" };

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = await getDictionary(lang);
  return {
    metadataBase: new URL(SITE_URL),
    applicationName: t.meta.siteName,
    ...pageMetadata({ lang, path: "", title: t.meta.title, description: t.meta.description }),
    // Après l’étalement : sinon le titre brut de pageMetadata écrasait le modèle et les
    // pages s’intitulaient « Shop », « About »… sans marque (audit 29/09, P1).
    title: { default: t.meta.title, template: `%s | ${t.meta.siteName}` },
  };
}

export default async function LangLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = await getDictionary(lang);

  return (
    <html lang={lang} className={display.variable}>
      <body className="flex min-h-dvh flex-col">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "BIEN Microdose",
            legalName: "Bien Health B.V.",
            url: SITE_URL,
            logo: `${SITE_URL}/brand/logo-bien.svg`,
            email: "info@bien.health",
            vatID: "NL864408997B01",
            sameAs: ["https://www.instagram.com/bien.health/"],
            address: {
              "@type": "PostalAddress",
              streetAddress: "Keizersgracht 391A",
              postalCode: "1016 EJ",
              addressLocality: "Amsterdam",
              addressCountry: "NL",
            },
          }}
        />
        <SiteHeader lang={lang} t={t.nav} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter lang={lang} t={t} />
        <AgeGate t={t.ageGate} />
        <Consent lang={lang} t={t.cookies} />
      </body>
    </html>
  );
}
