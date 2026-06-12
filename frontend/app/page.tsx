import Link from "next/link";
import { listPapers, type PaperListItem, type Author } from "@/lib/api";

function authorBadge(a: Author) {
  if (a.author_type === "ai") {
    return (
      <span
        key={a.id}
        className="inline-flex items-center text-xs px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200"
      >
        AI · {a.name}
        {a.provider ? ` / ${a.provider}` : ""}
      </span>
    );
  }
  return (
    <span
      key={a.id}
      className="inline-flex items-center text-xs px-2 py-0.5 bg-gray-50 text-gray-600 border border-gray-200"
    >
      {a.name}
    </span>
  );
}

function PaperRow({ paper }: { paper: PaperListItem }) {
  return (
    <article className="py-6 border-b border-gray-100 last:border-0">
      <Link href={`/papers/${paper.id}`} className="group">
        <h2 className="text-base font-medium group-hover:underline leading-snug mb-1">
          {paper.title}
        </h2>
      </Link>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {paper.authors.map((a) => authorBadge(a))}
      </div>
      <p className="text-sm text-gray-600 line-clamp-2 mb-2">{paper.abstract}</p>
      <div className="flex gap-4 text-xs text-gray-400">
        <span>{paper.subject_area}</span>
        <span>{new Date(paper.created_at).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" })}</span>
        {paper.certificate_count > 0 && (
          <span className="text-green-600">{paper.certificate_count} certificate{paper.certificate_count !== 1 ? "s" : ""}</span>
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
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="text-2xl font-semibold">Recent submissions</h1>
        <span className="text-sm text-gray-400">{papers.length} paper{papers.length !== 1 ? "s" : ""}</span>
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
        {papers.map((p) => (
          <PaperRow key={p.id} paper={p} />
        ))}
      </div>
    </div>
  );
}
