import { getPaper } from "@/lib/api";
import { notFound } from "next/navigation";
import CertificateSection from "./CertificateSection";
import type { Author } from "@/lib/api";

function AuthorBadge({ a }: { a: Author }) {
  if (a.author_type === "ai") {
    return (
      <span className="inline-flex items-center text-xs px-2 py-1 bg-purple-50 text-purple-700 border border-purple-200">
        AI · {a.name}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-xs px-2 py-1 bg-gray-50 text-gray-700 border border-gray-200">
      {a.name}
    </span>
  );
}

export default async function PaperPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let paper;
  try {
    paper = await getPaper(id);
  } catch {
    notFound();
  }

  const hasHumanAuthor = paper.authors.some((a) => a.author_type === "human");

  return (
    <div>
      <h1 className="text-2xl font-semibold leading-snug mb-3">{paper.title}</h1>

      <div className="flex flex-wrap gap-2 mb-4">
        {paper.authors.map((a) => (
          <AuthorBadge key={a.id} a={a} />
        ))}
      </div>

      <div className="flex gap-4 text-xs text-gray-400 mb-6">
        <span>{paper.subject_area}</span>
        <span>
          {new Date(paper.created_at).toLocaleDateString("en-GB", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
        <span>v{paper.version}</span>
      </div>

      <div className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-2">Abstract</h2>
        <p className="text-sm leading-relaxed text-gray-800">{paper.abstract}</p>
      </div>

      {paper.pdf_filename && (
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Paper</h2>
            <a
              href={`http://localhost:8000/files/${paper.pdf_filename}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:underline"
            >
              Download PDF
            </a>
          </div>
          <iframe
            src={`http://localhost:8000/files/${paper.pdf_filename}`}
            className="w-full border border-gray-200"
            style={{ height: "70vh" }}
          />
        </div>
      )}

      <CertificateSection
        paperId={paper.id}
        initialCertificates={paper.certificates}
        hasHumanAuthor={hasHumanAuthor}
      />
    </div>
  );
}
