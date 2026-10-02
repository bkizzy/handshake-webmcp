import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://mutualassent.com";
  return ["", "/terms", "/privacy", "/contact"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date("2026-10-02"),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.5,
  }));
}
