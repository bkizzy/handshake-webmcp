import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/deal/", "/dashboard", "/agreements/"] },
    sitemap: "https://mutualassent.com/sitemap.xml",
  };
}
