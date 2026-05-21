import { MetadataRoute } from "next";
import { MAX_KURAL_ID } from "@/lib/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = ["/", "/explore", "/about", "/terms", "/privacy"].map((url) => ({
    url: `https://onekural.com${url}`,
    changeFrequency: "weekly" as const,
    priority: url === "/" ? 1.0 : url === "/about" ? 0.7 : 0.5,
  }));

  const kuralPages = Array.from({ length: MAX_KURAL_ID }, (_, i) => ({
    url: `https://onekural.com/kural/${i + 1}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...kuralPages];
}
