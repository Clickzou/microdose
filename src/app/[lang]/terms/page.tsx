import { LegalPage, legalMetadata } from "@/components/legal-page";

export async function generateMetadata({ params }: PageProps<"/[lang]/terms">) {
  return legalMetadata("terms", (await params).lang);
}

export default async function Page({ params }: PageProps<"/[lang]/terms">) {
  return <LegalPage name="terms" lang={(await params).lang} />;
}
