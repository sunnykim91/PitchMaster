import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/matches", "/records", "/dues", "/members", "/board", "/rules", "/notifications", "/settings"],
    },
    sitemap: "https://pitch-master.app/sitemap.xml",
  };
}
