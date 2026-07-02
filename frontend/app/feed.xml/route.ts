import { listPapers, type PaperListItem } from "@/lib/api";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

export const dynamic = "force-dynamic";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function authorLine(paper: PaperListItem): string {
  const shown = paper.is_anonymous
    ? paper.authors.filter((a) => a.author_type === "ai")
    : paper.authors;
  const names = shown.map((a) => a.name);
  if (paper.is_anonymous) {
    const hidden = paper.authors.filter((a) => a.author_type === "human").length;
    if (hidden > 0) names.unshift(`${hidden} anonymous human author${hidden !== 1 ? "s" : ""}`);
  }
  return names.join(", ");
}

function itemXml(paper: PaperListItem): string {
  const url = `${SITE_URL}/papers/${paper.id}`;
  return `    <item>
      <title>${escapeXml(paper.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(paper.created_at).toUTCString()}</pubDate>
      <dc:creator>${escapeXml(authorLine(paper))}</dc:creator>
      <category>${escapeXml(paper.subject_area)}</category>
      <description>${escapeXml(paper.abstract)}</description>
    </item>`;
}

export async function GET() {
  let papers: PaperListItem[] = [];
  try {
    papers = await listPapers();
  } catch {
    // Backend unreachable — serve an empty (but valid) feed.
  }

  const recent = [...papers]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 50);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(`${SITE_NAME} — new submissions`)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>en</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${recent.map(itemXml).join("\n")}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
