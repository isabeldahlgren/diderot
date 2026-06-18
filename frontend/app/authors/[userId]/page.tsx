import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getUser,
  getUserAuthoredPapers,
  getUserSubmittedPapers,
  getUserReviewedPapers,
  type PaperListItem,
  type Author,
} from "@/lib/api";
import { ProfileActions } from "./ProfileActions";

function shortId(id: string): string {
  return id.replace(/-/g, "").slice(0, 8);
}

function formatAuthors(authors: Author[]): ReactNode {
  return (
    <span>
      {authors.map((a, i) => (
        <span key={a.id}>
          {i > 0 && <span className="text-gray-300 mx-1">·</span>}
          {a.author_type === "ai" ? (
            <span>
              <span className="text-purple-700">{a.name}</span>
              <span className="text-xs text-purple-400 ml-0.5">(AI)</span>
            </span>
          ) : a.user_id ? (
            <Link href={`/authors/${a.user_id}`} className="hover:underline">
              {a.name}
            </Link>
          ) : (
            <span>{a.name}</span>
          )}
        </span>
      ))}
    </span>
  );
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

function Section({ title, count, papers }: { title: string; count: number; papers: PaperListItem[] }) {
  return (
    <div className="mb-10">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
        {title} — {count} paper{count !== 1 ? "s" : ""}
      </h2>
      {papers.length === 0 ? (
        <p className="text-sm text-gray-500">None yet.</p>
      ) : (
        papers.map((p, i) => <PaperRow key={p.id} paper={p} index={i} />)
      )}
    </div>
  );
}

async function getOrcidAffiliation(orcidId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://pub.orcid.org/v3.0/${orcidId}/employments`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const groups: unknown[] = data["affiliation-group"] ?? [];
    for (const group of groups) {
      const summary = (group as { summaries?: { "employment-summary"?: { "end-date"?: unknown; organization?: { name?: string }; "role-title"?: string } }[] }).summaries?.[0]?.["employment-summary"];
      if (summary && !summary["end-date"] && summary.organization?.name) {
        const parts = [summary["role-title"], summary.organization.name].filter(Boolean);
        return parts.join(", ");
      }
    }
    return null;
  } catch {
    return null;
  }
}

export default async function AuthorPage({ params, searchParams }: { params: Promise<{ userId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { userId } = await params;
  const sp = await searchParams;
  const justLinked = sp.linked === "1";
  const orcidTaken = sp.error === "orcid_taken";
  const emailMismatch = sp.error === "email_mismatch";

  let user;
  let authored: PaperListItem[] = [];
  let submitted: PaperListItem[] = [];
  let certified: PaperListItem[] = [];

  try {
    [user, authored, submitted, certified] = await Promise.all([
      getUser(userId),
      getUserAuthoredPapers(userId),
      getUserSubmittedPapers(userId),
      getUserReviewedPapers(userId),
    ]);
  } catch {
    notFound();
  }

  const affiliation = user.orcid_id ? await getOrcidAffiliation(user.orcid_id) : null;

  return (
    <div className="max-w-3xl">
      <div className="mb-8 pb-6 border-b border-gray-200">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-900 transition-colors">← All papers</Link>
        <h1 className="text-2xl font-semibold mt-4 mb-1">{user.name}</h1>
        {affiliation && (
          <p className="text-sm text-gray-600 mb-1">{affiliation}</p>
        )}
        {orcidTaken && (
          <p className="text-sm text-red-500 mb-2">That ORCID iD is already linked to another account.</p>
        )}
        {emailMismatch && (
          <p className="text-sm text-red-500 mb-2">
            Your Diderot email does not match any email on that ORCID record. Make sure your email is set to &ldquo;public&rdquo; visibility on your ORCID profile.
          </p>
        )}
        {justLinked && (
          <p className="text-sm text-green-600 mb-2">ORCID iD linked successfully.</p>
        )}
        <p className="text-sm text-gray-400 flex items-center gap-2 flex-wrap">
          {user.orcid_id ? (
            <a
              href={`https://orcid.org/${user.orcid_id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs border border-gray-300 px-2 py-0.5 hover:border-gray-600 hover:text-gray-700 transition-colors font-mono"
            >
              <span className="text-green-600 font-bold">iD</span>
              {user.orcid_id}
            </a>
          ) : (
            <ProfileActions userId={userId} hasOrcid={false} />
          )}
          <span>Member since {new Date(user.created_at).toLocaleDateString("en-GB", { year: "numeric", month: "long" })}</span>
        </p>
      </div>

      <Section title="Papers certified" count={certified.length} papers={certified} />
      <Section title="Papers authored" count={authored.length} papers={authored} />
      <Section title="Papers submitted" count={submitted.length} papers={submitted} />
    </div>
  );
}
