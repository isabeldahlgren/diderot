import Link from "next/link";
import { listPapers, type PaperListItem, type Author } from "@/lib/api";

function shortId(id: string): string {
  return id.replace(/-/g, "").slice(0, 8);
}

function formatAuthors(authors: Author[]): string {
  return authors
    .map((a) => (a.author_type === "ai" ? `AI: ${a.name}` : a.name))
    .join("; ");
}

function PaperRow({ paper, index }: { paper: PaperListItem; index: number }) {
  const date = new Date(paper.created_at).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const hasAI = paper.authors.some((a) => a.author_type === "ai");

  return (
    <article className="py-5 border-b border-gray-100 last:border-0">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-xs text-gray-400 font-mono whitespace-nowrap">
          [{index + 1}] OA:{shortId(paper.id)}
        </span>
        <span className="text-xs text-gray-500 border border-gray-200 px-1.5 py-0.5 leading-tight">
          {paper.subject_area}
        </span>
        {hasAI && (
          <span className="text-xs text-purple-600 border border-purple-200 px-1.5 py-0.5 leading-tight bg-purple-50">
            AI-authored
          </span>
        )}
      </div>

      <Link href={`/papers/${paper.id}`} className="group">
        <h2 className="text-base font-medium group-hover:underline leading-snug mb-1">
          {paper.title}
        </h2>
      </Link>

      <p className="text-sm text-gray-600 mb-1">
        {formatAuthors(paper.authors)}
      </p>

      <p className="text-sm text-gray-500 line-clamp-2 mb-2 leading-relaxed">
        {paper.abstract}
      </p>

      <div className="flex gap-4 text-xs text-gray-400">
        <span>Submitted {date}</span>
        <span>v{paper.version}</span>
        {paper.certificate_count > 0 && (
          <span className="text-green-700">
            {paper.certificate_count} certificate{paper.certificate_count !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </article>
  );
}

export default async function Home() {
  let papers: PaperListItem[] = [];
  let error = false;

  try {
    papers = await listPapers();
  } catch {
    error = true;
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Recent Submissions</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Showing {papers.length} paper{papers.length !== 1 ? "s" : ""}, newest first
          </p>
        </div>
        <Link
          href="/submit"
          className="text-sm px-4 py-1.5 border border-gray-900 hover:bg-gray-900 hover:text-white transition-colors"
        >
          Submit paper
        </Link>
      </div>

      {error && (
        <p className="text-sm text-red-500">Could not connect to the API. Is the backend running?</p>
      )}

      {!error && papers.length === 0 && (
        <p className="text-sm text-gray-500">
          No papers yet.{" "}
          <Link href="/submit" className="underline">
            Submit the first one.
          </Link>
        </p>
      )}

      <div>
        {papers.map((p, i) => (
          <PaperRow key={p.id} paper={p} index={i} />
        ))}
      </div>
    </div>
  );
}
