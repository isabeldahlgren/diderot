import type { ReactNode } from "react";
import { getPaper, getPaperVersions } from "@/lib/api";
import { notFound } from "next/navigation";
import Link from "next/link";
import CertificateSection from "./CertificateSection";
import CommentSection from "./CommentSection";
import CiteButton from "./CiteButton";
import VersionSection from "./VersionSection";
import type { Author } from "@/lib/api";

const FILES_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000") + "/files";

function shortId(id: string): string {
  return id.replace(/-/g, "").slice(0, 8);
}

function formatAuthorLine(authors: Author[]): ReactNode {
  return (
    <span>
      {authors.map((a, i) => (
        <span key={a.id}>
          {i > 0 && <span className="text-gray-300 mx-1">·</span>}
          {a.author_type === "ai" ? (
            <span className="text-purple-700">{a.name}</span>
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

export default async function PaperPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let paper;
  let versions;
  try {
    [paper, versions] = await Promise.all([getPaper(id), getPaperVersions(id)]);
  } catch {
    notFound();
  }

  const hasHumanAuthor = paper.authors.some((a) => a.author_type === "human");
  const submittedDate = new Date(paper.created_at).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const submitter = paper.submitter_user_id
    ? paper.authors.find((a) => a.user_id === paper.submitter_user_id)
    : null;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-4 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-900 transition-colors">← All papers</Link>
        <span className="text-gray-300">|</span>
        <span className="font-mono text-xs">OA:{shortId(paper.id)}</span>
        <span className="border border-gray-300 px-1.5 py-0.5 text-xs leading-tight">
          {paper.subject_area}
        </span>
        <span className="text-xs">v{paper.version}</span>
        <span className="text-xs">Submitted {submittedDate}</span>
        {paper.submitter_user_id && (
          <span className="text-xs">
            by{" "}
            <Link
              href={`/authors/${paper.submitter_user_id}`}
              className="font-semibold hover:underline"
            >
              {submitter?.name ?? "unknown"}
            </Link>
          </span>
        )}
      </div>

      <h1 className="text-2xl font-semibold leading-snug mb-3">{paper.title}</h1>

      <p className="text-sm text-gray-700 mb-6">
        {formatAuthorLine(paper.authors)}
      </p>

      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Abstract</h2>
        <p className="text-sm leading-relaxed text-gray-800">{paper.abstract}</p>
      </section>

      <div className="flex items-center gap-4 mb-8 py-3 border-t border-b border-gray-100">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Access</span>
        {paper.pdf_filename ? (
          <a
            href={`${FILES_BASE}/${paper.pdf_filename}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm border border-gray-800 px-3 py-1 text-gray-800 hover:bg-gray-900 hover:text-white transition-colors"
          >
            PDF
          </a>
        ) : (
          <span className="text-sm text-gray-400">No PDF</span>
        )}
        <CiteButton
          bibtex={`@misc{diderot:${shortId(paper.id)},\n  title={${paper.title}},\n  author={${paper.authors.map((a) => a.name).join(" and ")}},\n  year={${new Date(paper.created_at).getFullYear()}},\n  note={Diderot preprint OA:${shortId(paper.id)}}\n}`}
        />
      </div>

      {paper.pdf_filename && (
        <div className="mb-10">
          <iframe
            src={`${FILES_BASE}/${paper.pdf_filename}`}
            className="w-full border border-gray-200"
            style={{ height: "70vh" }}
          />
        </div>
      )}

      <VersionSection
        paperId={paper.id}
        submitterUserId={paper.submitter_user_id}
        versions={versions}
      />

      <section className="border-t border-gray-200 pt-6">
        <CertificateSection
          paperId={paper.id}
          initialCertificates={paper.certificates}
          hasHumanAuthor={hasHumanAuthor}
        />
      </section>

      <section className="border-t border-gray-200 pt-6 mt-8">
        <CommentSection paperId={paper.id} />
      </section>
    </div>
  );
}
