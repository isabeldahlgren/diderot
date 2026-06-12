import { notFound } from "next/navigation";
import Link from "next/link";
import { getUser, getUserPapers, getUserReviews, type PaperListItem, type Author } from "@/lib/api";

function shortId(id: string): string {
  return id.replace(/-/g, "").slice(0, 8);
}

function formatAuthors(authors: Author[]): string {
  return authors.map((a) => (a.author_type === "ai" ? `AI: ${a.name}` : a.name)).join("; ");
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
        <span className="text-xs text-gray-400 font-mono whitespace-nowrap">[{index + 1}] OA:{shortId(paper.id)}</span>
        <span className="text-xs text-gray-500 border border-gray-200 px-1.5 py-0.5 leading-tight">{paper.subject_area}</span>
        {hasAI && (
          <span className="text-xs text-purple-600 border border-purple-200 px-1.5 py-0.5 leading-tight bg-purple-50">AI-authored</span>
        )}
        {paper.version > 1 && (
          <span className="text-xs text-gray-400 font-mono">v{paper.version}</span>
        )}
      </div>
      <Link href={`/papers/${paper.id}`} className="group">
        <h2 className="text-base font-medium group-hover:underline leading-snug mb-1">{paper.title}</h2>
      </Link>
      <p className="text-sm text-gray-600 mb-1">{formatAuthors(paper.authors)}</p>
      <p className="text-sm text-gray-500 line-clamp-2 mb-2 leading-relaxed">{paper.abstract}</p>
      <div className="flex gap-4 text-xs text-gray-400">
        <span>Submitted {date}</span>
        {paper.certificate_count > 0 && (
          <span className="text-green-700">{paper.certificate_count} certificate{paper.certificate_count !== 1 ? "s" : ""}</span>
        )}
      </div>
    </article>
  );
}

export default async function AuthorPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  let user;
  let papers: PaperListItem[] = [];
  let reviews: PaperListItem[] = [];

  try {
    [user, papers, reviews] = await Promise.all([
      getUser(userId),
      getUserPapers(userId),
      getUserReviews(userId),
    ]);
  } catch {
    notFound();
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8 pb-6 border-b border-gray-200">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-900 transition-colors">← All papers</Link>
        <h1 className="text-2xl font-semibold mt-4 mb-1">{user.name}</h1>
        <p className="text-sm text-gray-400">
          Member since {new Date(user.created_at).toLocaleDateString("en-GB", { year: "numeric", month: "long" })}
        </p>
      </div>

      <div className="mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          Submissions — {papers.length} paper{papers.length !== 1 ? "s" : ""}
        </h2>
      </div>

      {papers.length === 0 ? (
        <p className="text-sm text-gray-500 mb-10">No papers submitted yet.</p>
      ) : (
        <div className="mb-10">
          {papers.map((p, i) => (
            <PaperRow key={p.id} paper={p} index={i} />
          ))}
        </div>
      )}

      <div className="mb-4 border-t border-gray-200 pt-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          Peer reviews — {reviews.length} paper{reviews.length !== 1 ? "s" : ""}
        </h2>
      </div>

      {reviews.length === 0 ? (
        <p className="text-sm text-gray-500">No peer reviews yet.</p>
      ) : (
        <div>
          {reviews.map((p, i) => (
            <PaperRow key={p.id} paper={p} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
