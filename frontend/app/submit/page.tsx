"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { submitPaper, getPaper, type AuthorType, type Paper } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CertificateModal } from "@/app/papers/[id]/CertificateSection";

const AUTHOR_TYPE_OPTIONS = [
  { value: "human", label: "human" },
  { value: "ai", label: "AI" },
];

function CustomSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-gray-500 cursor-pointer flex items-center gap-2 whitespace-nowrap"
      >
        {selected?.label ?? value}
        <span className="text-gray-400 text-xs select-none">▾</span>
      </button>
      {open && (
        <div className="absolute z-10 top-full left-0 mt-0.5 border border-gray-300 bg-white shadow-sm min-w-full">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ${
                opt.value === value ? "text-gray-900 font-medium" : "text-gray-600"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface AuthorRow {
  name: string;
  author_type: AuthorType;
  model_id: string;
}

const emptyAuthor = (): AuthorRow => ({
  name: "",
  author_type: "human",
  model_id: "",
});

function AuthorRowItem({
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
        {!isAI && (
          <input
            className="flex-1 border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-500"
            placeholder="Name"
            value={author.name}
            onChange={(e) => onChange(index, "name", e.target.value)}
            required
          />
        )}
        {isAI && (
          <input
            className="flex-1 border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-500"
            placeholder="Model ID (e.g. anthropic/claude-sonnet-4-6)"
            value={author.model_id}
            onChange={(e) => onChange(index, "model_id", e.target.value)}
            required
          />
        )}
        <CustomSelect
          value={author.author_type}
          onChange={(v) => onChange(index, "author_type", v)}
          options={AUTHOR_TYPE_OPTIONS}
        />
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
    </div>
  );
}

function SubmitPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const parentId = searchParams.get("parent_id");
  const { user, token } = useAuth();

  const [parentPaper, setParentPaper] = useState<Paper | null>(null);
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

  useEffect(() => {
    if (!parentId) return;
    getPaper(parentId).then((p) => {
      setParentPaper(p);
      setTitle(p.title);
      setAbstract(p.abstract);
      setSubjectArea(p.subject_area);
      setAuthors(
        p.authors.map((a) => ({
          name: a.author_type === "ai" ? (a.model_version ?? a.name) : a.name,
          author_type: a.author_type,
          model_id: a.author_type === "ai" ? (a.model_version ?? a.name) : "",
        }))
      );
    }).catch(() => {});
  }, [parentId]);

  function updateAuthor(i: number, field: keyof AuthorRow, value: string) {
    setAuthors((prev) => prev.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)));
  }

  function removeAuthor(i: number) {
    setAuthors((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pdf) { setError("Please select a PDF file."); return; }
    if (!token) { setError("Not authenticated. Please sign in again."); return; }

    setSubmitting(true);
    setError("");

    try {
      const paper = await submitPaper({
        title,
        abstract,
        subject_area: subjectArea,
        authors: authors.map((a) => {
          const slashIdx = a.model_id.indexOf("/");
          const provider = slashIdx > -1 ? a.model_id.slice(0, slashIdx) : undefined;
          return {
            name: a.author_type === "ai" ? (a.model_id || a.name) : a.name,
            author_type: a.author_type,
            model_version: a.model_id || undefined,
            provider,
          };
        }),
        pdf,
        token,
        parent_id: parentId ?? undefined,
      });
      setSubmittedPaper(paper);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
      setSubmitting(false);
    }
  }

  if (!user) return null;

  if (submittedPaper) {
    const hasHumanAuthor = submittedPaper.authors.some((a) => a.author_type === "human");
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold mb-4">Paper submitted</h1>
        <p className="text-sm text-gray-500 mb-8">
          <span className="font-medium text-gray-900">{submittedPaper.title}</span>
          {submittedPaper.version > 1 && (
            <span className="ml-1 text-gray-400">(v{submittedPaper.version})</span>
          )}{" "}
          has been submitted.
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
      {parentPaper ? (
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-1">Submit revised version</h1>
          <p className="text-sm text-gray-500">
            Revising{" "}
            <Link href={`/papers/${parentPaper.id}`} className="underline hover:text-gray-900">
              {parentPaper.title}
            </Link>{" "}
            (v{parentPaper.version} → v{parentPaper.version + 1})
          </p>
        </div>
      ) : (
        <h1 className="text-2xl font-semibold mb-8">Submit a paper</h1>
      )}

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
          <select
            className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500 bg-white"
            value={subjectArea}
            onChange={(e) => setSubjectArea(e.target.value)}
            required
          >
            <option value="">Select a subject area</option>
            <option value="math.AG">math.AG — Algebraic Geometry</option>
            <option value="math.AT">math.AT — Algebraic Topology</option>
            <option value="math.AP">math.AP — Analysis of PDEs</option>
            <option value="math.CT">math.CT — Category Theory</option>
            <option value="math.CA">math.CA — Classical Analysis and ODEs</option>
            <option value="math.CO">math.CO — Combinatorics</option>
            <option value="math.AC">math.AC — Commutative Algebra</option>
            <option value="math.CV">math.CV — Complex Variables</option>
            <option value="math.DG">math.DG — Differential Geometry</option>
            <option value="math.DS">math.DS — Dynamical Systems</option>
            <option value="math.FA">math.FA — Functional Analysis</option>
            <option value="math.GM">math.GM — General Mathematics</option>
            <option value="math.GN">math.GN — General Topology</option>
            <option value="math.GT">math.GT — Geometric Topology</option>
            <option value="math.GR">math.GR — Group Theory</option>
            <option value="math.HO">math.HO — History and Overview</option>
            <option value="math.IT">math.IT — Information Theory</option>
            <option value="math.KT">math.KT — K-Theory and Homology</option>
            <option value="math.LO">math.LO — Logic</option>
            <option value="math.MP">math.MP — Mathematical Physics</option>
            <option value="math.MG">math.MG — Metric Geometry</option>
            <option value="math.NT">math.NT — Number Theory</option>
            <option value="math.NA">math.NA — Numerical Analysis</option>
            <option value="math.OA">math.OA — Operator Algebras</option>
            <option value="math.OC">math.OC — Optimization and Control</option>
            <option value="math.PR">math.PR — Probability</option>
            <option value="math.QA">math.QA — Quantum Algebra</option>
            <option value="math.RT">math.RT — Representation Theory</option>
            <option value="math.RA">math.RA — Rings and Algebras</option>
            <option value="math.SP">math.SP — Spectral Theory</option>
            <option value="math.ST">math.ST — Statistics Theory</option>
            <option value="math.SG">math.SG — Symplectic Geometry</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Authors</label>
          {authors.map((a, i) => (
            <AuthorRowItem
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
              style={{ display: "none" }}
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
          {submitting ? "Submitting…" : parentPaper ? `Submit v${parentPaper.version + 1}` : "Submit paper"}
        </button>
      </form>
    </div>
  );
}

export default function SubmitPage() {
  return (
    <Suspense fallback={null}>
      <SubmitPageInner />
    </Suspense>
  );
}
