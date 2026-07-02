import type { MetadataRoute } from "next";
import { listPapers } from "@/lib/api";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/principles`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/documentation`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/roadmap`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/submit`, changeFrequency: "yearly", priority: 0.5 },
  ];

  try {
    const papers = await listPapers();
    return [
      ...staticPages,
      ...papers.map((p) => ({
        url: `${SITE_URL}/papers/${p.id}`,
        lastModified: new Date(p.created_at),
        changeFrequency: "weekly" as const,
        priority: 0.9,
      })),
    ];
  } catch {
    return staticPages;
  }
}
