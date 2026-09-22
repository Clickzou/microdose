import { LegalPage, legalMetadata } from "@/components/legal-page";

export async function generateMetadata({ params }: PageProps<"/[lang]/privacy">) {
  return legalMetadata("privacy", (await params).lang);
}

export default async function Page({ params }: PageProps<"/[lang]/privacy">) {
  return <LegalPage name="privacy" lang={(await params).lang} />;
}
