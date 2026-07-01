import type { ReactNode } from "react";
import { getPaper, getPaperVersions } from "@/lib/api";
import { notFound } from "next/navigation";
import Link from "next/link";
import CertificateSection from "./CertificateSection";
import CommentSection from "./CommentSection";
import CiteButton from "./CiteButton";
import VersionSection from "./VersionSection";
import LatexText from "@/app/LatexText";
import type { Author } from "@/lib/api";

const FILES_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000") + "/files";

const LICENSE_META: Record<string, { label: string; url: string }> = {
  "cc-by-4.0": { label: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
  "cc-by-sa-4.0": { label: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" },
  "cc-by-nc-sa-4.0": { label: "CC BY-NC-SA 4.0", url: "https://creativecommons.org/licenses/by-nc-sa/4.0/" },
  "cc-by-nc-nd-4.0": { label: "CC BY-NC-ND 4.0", url: "https://creativecommons.org/licenses/by-nc-nd/4.0/" },
  "cc-zero": { label: "CC0 1.0", url: "https://creativecommons.org/publicdomain/zero/1.0/" },
};

function shortId(id: string): string {
  return id.replace(/-/g, "").slice(0, 8);
}

function formatAuthorLine(authors: Author[], anonymous?: boolean): ReactNode {
  const shown = anonymous ? authors.filter((a) => a.author_type === "ai") : authors;
  const items: ReactNode[] = [];
  if (anonymous) {
    const n = authors.filter((a) => a.author_type === "human").length;
    if (n > 0) {
      items.push(
        <span key="anon" className="text-gray-500">
          {n} human author{n !== 1 ? "s" : ""}
        </span>
      );
    }
  }
  shown.forEach((a) => {
    items.push(
      a.author_type === "ai" ? (
        <Link key={a.id} href={`/models/${a.name}`} className="text-purple-700 hover:underline">
          {a.name}
        </Link>
      ) : a.user_id ? (
        <Link key={a.id} href={`/authors/${a.user_id}`} className="hover:underline">
          {a.name}
        </Link>
      ) : (
        <span key={a.id}>{a.name}</span>
      )
    );
  });
  return (
    <span>
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && <span className="text-gray-300 mx-1">·</span>}
          {item}
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
  const submitterName = paper.submitter_name ?? null;

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
        {paper.is_anonymous ? (
          <span className="text-xs">by Anonymous</span>
        ) : paper.submitter_user_id ? (
          <span className="text-xs">
            by{" "}
            <Link
              href={`/authors/${paper.submitter_user_id}`}
              className="font-semibold hover:underline"
            >
              {submitterName ?? "unknown"}
            </Link>
          </span>
        ) : null}
      </div>

      <h1 className="text-2xl font-semibold leading-snug mb-3">{paper.title}</h1>

      <p className="text-sm text-gray-700 mb-6">
        {formatAuthorLine(paper.authors, paper.is_anonymous)}
      </p>

      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Abstract</h2>
        <LatexText text={paper.abstract} className="text-sm leading-relaxed text-gray-800" />
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
          bibtex={`@misc{diderot:${shortId(paper.id)},\n  title={${paper.title}},\n  author={${paper.authors.map((a) => a.name).join(" and ")}},\n  year={${new Date(paper.created_at).getFullYear()}},${paper.doi ? `\n  doi={${paper.doi}},` : ""}\n  note={Diderot preprint OA:${shortId(paper.id)}}\n}`}
        />
        {paper.doi && (
          <a
            href={`https://doi.org/${paper.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-mono"
          >
            {paper.doi}
          </a>
        )}
        {paper.supplementary_url && (
          <a
            href={paper.supplementary_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm border border-gray-800 px-3 py-1 text-gray-800 hover:bg-gray-900 hover:text-white transition-colors"
          >
            Supplementary files
          </a>
        )}
        {paper.license && LICENSE_META[paper.license] ? (
          <a
            href={LICENSE_META[paper.license].url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 hover:text-gray-900 transition-colors ml-auto"
          >
            {LICENSE_META[paper.license].label}
          </a>
        ) : paper.license ? (
          <span className="text-xs text-gray-500 ml-auto">{paper.license}</span>
        ) : null}
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
