import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@/dictionaries";
import { hasLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/ui";
import ContactForm from "@/components/contact-form";

export async function generateMetadata({ params }: PageProps<"/[lang]/contact">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = await getDictionary(lang);
  return pageMetadata({ lang, path: "/contact", title: `${t.contact.title} ${t.contact.accent}`, description: t.contact.intro });
}

export default async function Contact({ params }: PageProps<"/[lang]/contact">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = await getDictionary(lang);
  return (
    <>
      <PageHero a={t.contact.title} b={t.contact.accent} intro={t.contact.intro} />
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <ContactForm lang={lang} t={t.contact} />
        <p className="mt-10 text-ink-soft">
          {t.contact.direct}
          <br />
          <a href="mailto:info@bien.health" className="font-medium text-ink underline underline-offset-4">
            info@bien.health
          </a>
        </p>
      </section>
    </>
  );
}
