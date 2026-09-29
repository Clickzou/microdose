import type { MetadataRoute } from "next";
import { SITE_URL, indexingAllowed } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  if (!indexingAllowed()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/seo", "/*/cart", "/*/checkout", "/*/order/"] },
      // Moteurs génératifs autorisés explicitement (GEO, master SEO § 9) : plus robuste
      // qu’une simple couverture par « * » face aux évolutions de leurs règles.
      {
        userAgent: ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Google-Extended", "ClaudeBot", "Claude-SearchBot", "Applebot-Extended"],
        allow: "/",
        disallow: ["/api/", "/seo", "/*/cart", "/*/checkout", "/*/order/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
