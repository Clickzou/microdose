import type { Metadata } from "next";
import { BlogPage, blogMetadata, blogStaticParams } from "@/components/blog-page";

export const revalidate = 3600;

export function generateStaticParams() {
  return blogStaticParams("allPaged");
}

export async function generateMetadata({ params }: PageProps<"/[lang]/learn/page/[n]">): Promise<Metadata> {
  return blogMetadata(await params);
}

export default async function LearnPaged({ params }: PageProps<"/[lang]/learn/page/[n]">) {
  return <BlogPage params={await params} />;
}
