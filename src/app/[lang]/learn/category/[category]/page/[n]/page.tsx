import type { Metadata } from "next";
import { BlogPage, blogMetadata, blogStaticParams } from "@/components/blog-page";

export const revalidate = 3600;

export function generateStaticParams() {
  return blogStaticParams("categoryPaged");
}

export async function generateMetadata({ params }: PageProps<"/[lang]/learn/category/[category]/page/[n]">): Promise<Metadata> {
  return blogMetadata(await params);
}

export default async function LearnCategoryPaged({ params }: PageProps<"/[lang]/learn/category/[category]/page/[n]">) {
  return <BlogPage params={await params} />;
}
