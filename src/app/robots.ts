import type { MetadataRoute } from "next";
import { SITE_URL, indexingAllowed } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  if (!indexingAllowed()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/seo", "/*/cart", "/*/checkout", "/*/order/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
