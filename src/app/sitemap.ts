import type { MetadataRoute } from "next";
import { listGuides } from "@/lib/guides/registry";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://pitch-master.app";

  const guidePosts = listGuides().map((g) => ({
    url: `${baseUrl}/guide/${g.meta.slug}`,
    lastModified: new Date(g.meta.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/guide`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/help`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...guidePosts,
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
