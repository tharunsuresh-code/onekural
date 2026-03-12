import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // General crawlers: allow public pages, block private/API routes
      {
        userAgent: "*",
        allow: ["/", "/data/", "/llms.txt", "/llms-full.txt", "/openapi.yaml"],
        disallow: ["/api/", "/journal", "/profile"],
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
