import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/journal", "/profile"] },
    sitemap: "https://onekural.com/sitemap.xml",
  };
}
