import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, Instrument_Serif } from "next/font/google";
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

// Polices auto-hébergées par next/font (téléchargées au build, servies depuis le
// domaine du site) : aucune requête vers Google au chargement de la page.
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap", weight: ["600", "700", "800"] });
const body = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], variable: "--font-instrument", display: "swap", weight: "400", style: ["italic"] });

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
    title: { default: t.meta.title, template: `%s — ${t.meta.siteName}` },
    ...pageMetadata({ lang, path: "", title: t.meta.title, description: t.meta.description }),
  };
}

export default async function LangLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = await getDictionary(lang);

  return (
    <html lang={lang} className={`${display.variable} ${body.variable} ${serif.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "BIEN Microdose",
            legalName: "Bien B.V.",
            url: SITE_URL,
            logo: `${SITE_URL}/brand/logo-bien.svg`,
            email: "info@bien.health",
            vatID: "NL864408997B01",
            address: { "@type": "PostalAddress", addressCountry: "NL" },
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
