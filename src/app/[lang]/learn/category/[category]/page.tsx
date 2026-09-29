import type { Metadata } from "next";
import { BlogPage, blogMetadata, blogStaticParams } from "@/components/blog-page";

export const revalidate = 3600;

export function generateStaticParams() {
  return blogStaticParams("category");
}

export async function generateMetadata({ params }: PageProps<"/[lang]/learn/category/[category]">): Promise<Metadata> {
  return blogMetadata(await params);
}

export default async function LearnCategory({ params }: PageProps<"/[lang]/learn/category/[category]">) {
  return <BlogPage params={await params} />;
}
