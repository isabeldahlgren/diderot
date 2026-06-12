"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { submitPaper, type AuthorType, type Paper } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CertificateModal } from "@/app/papers/[id]/CertificateSection";

function StyledSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative inline-block">
      <select
        className={`appearance-none border border-gray-300 px-3 py-1.5 pr-8 text-sm bg-white focus:outline-none focus:border-gray-500 cursor-pointer ${className ?? ""}`}
        {...props}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-gray-400 text-xs select-none">▾</span>
    </div>
  );
}

interface AuthorRow {
  name: string;
  author_type: AuthorType;
  model_family: string;
  model_version: string;
  provider: string;
  contribution: string;
}

const emptyAuthor = (): AuthorRow => ({
  name: "",
  author_type: "human",
  model_family: "",
  model_version: "",
  provider: "",
  contribution: "",
});

function AuthorRow({
  author,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  author: AuthorRow;
  index: number;
  onChange: (i: number, field: keyof AuthorRow, value: string) => void;
  onRemove: (i: number) => void;
  canRemove: boolean;
}) {
  const isAI = author.author_type === "ai";

  return (
    <div className="p-4 border border-gray-200 mb-3">
      <div className="flex gap-3 mb-3">
        <input
          className="flex-1 border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-500"
          placeholder="Name"
          value={author.name}
          onChange={(e) => onChange(index, "name", e.target.value)}
          required
        />
        <StyledSelect
          value={author.author_type}
          onChange={(e) => onChange(index, "author_type", e.target.value)}
        >
          <option value="human">human</option>
          <option value="ai">AI</option>
          <option value="human+ai">human+AI</option>
        </StyledSelect>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-xs text-gray-400 hover:text-red-500 px-2"
          >
            remove
          </button>
        )}
      </div>
      <input
        className="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-500 mb-2"
        placeholder="Contribution (e.g. proof search, draft writing)"
        value={author.contribution}
        onChange={(e) => onChange(index, "contribution", e.target.value)}
      />
      {isAI && (
        <div className="flex gap-3">
          <input
            className="flex-1 border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-500"
            placeholder="Provider (e.g. Anthropic)"
            value={author.provider}
            onChange={(e) => onChange(index, "provider", e.target.value)}
          />
          <input
            className="flex-1 border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-500"
            placeholder="Model version (e.g. claude-sonnet-4-6)"
            value={author.model_version}
            onChange={(e) => onChange(index, "model_version", e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

export default function SubmitPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [subjectArea, setSubjectArea] = useState("");
  const [authors, setAuthors] = useState<AuthorRow[]>([emptyAuthor()]);
  const [pdf, setPdf] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submittedPaper, setSubmittedPaper] = useState<Paper | null>(null);
  const [certModalOpen, setCertModalOpen] = useState(false);

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  function updateAuthor(i: number, field: keyof AuthorRow, value: string) {
    setAuthors((prev) => prev.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)));
  }

  function removeAuthor(i: number) {
    setAuthors((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pdf) { setError("Please select a PDF file."); return; }

    setSubmitting(true);
    setError("");

    try {
      const paper = await submitPaper({
        title,
        abstract,
        subject_area: subjectArea,
        authors: authors.map((a) => ({
          name: a.name,
          author_type: a.author_type,
          model_family: a.model_family || undefined,
          model_version: a.model_version || undefined,
          provider: a.provider || undefined,
          contribution: a.contribution || undefined,
        })),
        pdf,
      });
      setSubmittedPaper(paper);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
      setSubmitting(false);
    }
  }

  if (!user) return null;

  if (submittedPaper) {
    const hasHumanAuthor = submittedPaper.authors.some(
      (a) => a.author_type === "human" || a.author_type === "human+ai"
    );
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold mb-4">Paper submitted</h1>
        <p className="text-sm text-gray-500 mb-8">
          <span className="font-medium text-gray-900">{submittedPaper.title}</span> has been submitted.
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCertModalOpen(true)}
            className="text-sm px-4 py-1.5 border border-gray-900 hover:bg-gray-900 hover:text-white transition-colors"
          >
            + add AI disclosure certificate
          </button>
          <Link
            href={`/papers/${submittedPaper.id}`}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            View paper →
          </Link>
        </div>
        {certModalOpen && token && (
          <CertificateModal
            paperId={submittedPaper.id}
            hasHumanAuthor={hasHumanAuthor}
            token={token}
            onAdded={() => {}}
            onClose={() => {
              setCertModalOpen(false);
              router.push(`/papers/${submittedPaper.id}`);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-8">Submit a paper</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Abstract</label>
          <textarea
            className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500 resize-none"
            rows={5}
            value={abstract}
            onChange={(e) => setAbstract(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Subject area</label>
          <input
            className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            placeholder="e.g. Mathematics, Computer Science, Biology"
            value={subjectArea}
            onChange={(e) => setSubjectArea(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Authors</label>
          {authors.map((a, i) => (
            <AuthorRow
              key={i}
              author={a}
              index={i}
              onChange={updateAuthor}
              onRemove={removeAuthor}
              canRemove={authors.length > 1}
            />
          ))}
          <button
            type="button"
            onClick={() => setAuthors((prev) => [...prev, emptyAuthor()])}
            className="text-sm text-gray-500 hover:text-gray-900 underline"
          >
            + add author
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">PDF</label>
          <label className="inline-flex items-center gap-3 cursor-pointer">
            <span className="border border-gray-300 px-3 py-1.5 text-sm hover:border-gray-500 transition-colors text-gray-600 select-none">
              {pdf ? pdf.name : "Choose file…"}
            </span>
            <input
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
              required
            />
          </label>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2 bg-gray-900 text-white text-sm hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Submitting…" : "Submit paper"}
        </button>
      </form>
    </div>
  );
}
