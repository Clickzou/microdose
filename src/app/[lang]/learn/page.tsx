import type { Metadata } from "next";
import { BlogPage, blogMetadata } from "@/components/blog-page";

// Régénérée toutes les heures : les articles programmés (publishAt) y apparaissent
// le jour de leur parution, sans redéploiement.
export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps<"/[lang]/learn">): Promise<Metadata> {
  return blogMetadata(await params);
}

export default async function Learn({ params }: PageProps<"/[lang]/learn">) {
  return <BlogPage params={await params} />;
}
