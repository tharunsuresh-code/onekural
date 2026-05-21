import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // General crawlers (Googlebot, etc.): allow all public pages
      {
        userAgent: "*",
        allow: ["/", "/kural/", "/explore", "/about", "/terms", "/privacy", "/data/", "/llms.txt", "/llms-full.txt", "/openapi.yaml"],
        disallow: ["/api/", "/journal", "/profile", "/delete-account"],
      },
      // LLM crawlers: explicitly allow public content + data files
      {
        userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "anthropic-ai", "GoogleExtended", "Applebot-Extended", "ChatGPT-User"],
        allow: ["/", "/kural/", "/explore", "/about", "/data/", "/llms.txt", "/llms-full.txt", "/openapi.yaml", "/api/openapi"],
        disallow: ["/journal", "/profile", "/api/push/"],
      },
    ],
    sitemap: "https://onekural.com/sitemap.xml",
  };
}
