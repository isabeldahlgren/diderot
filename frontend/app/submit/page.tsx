"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { submitPaper, getPaper, lookupUserByOrcid, type AuthorType, type Paper } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CertificateModal } from "@/app/papers/[id]/CertificateSection";

const AUTHOR_TYPE_OPTIONS = [
  { value: "human", label: "human" },
  { value: "ai", label: "AI" },
];

const SUBJECT_OPTIONS = [
  { value: "", label: "Select a subject area" },
  { value: "math.AG", label: "math.AG — Algebraic Geometry" },
  { value: "math.AT", label: "math.AT — Algebraic Topology" },
  { value: "math.AP", label: "math.AP — Analysis of PDEs" },
  { value: "math.CT", label: "math.CT — Category Theory" },
  { value: "math.CA", label: "math.CA — Classical Analysis and ODEs" },
  { value: "math.CO", label: "math.CO — Combinatorics" },
  { value: "math.AC", label: "math.AC — Commutative Algebra" },
  { value: "math.CV", label: "math.CV — Complex Variables" },
  { value: "math.DG", label: "math.DG — Differential Geometry" },
  { value: "math.DS", label: "math.DS — Dynamical Systems" },
  { value: "math.FA", label: "math.FA — Functional Analysis" },
  { value: "math.GM", label: "math.GM — General Mathematics" },
  { value: "math.GN", label: "math.GN — General Topology" },
  { value: "math.GT", label: "math.GT — Geometric Topology" },
  { value: "math.GR", label: "math.GR — Group Theory" },
  { value: "math.HO", label: "math.HO — History and Overview" },
  { value: "math.IT", label: "math.IT — Information Theory" },
  { value: "math.KT", label: "math.KT — K-Theory and Homology" },
  { value: "math.LO", label: "math.LO — Logic" },
  { value: "math.MP", label: "math.MP — Mathematical Physics" },
  { value: "math.MG", label: "math.MG — Metric Geometry" },
  { value: "math.NT", label: "math.NT — Number Theory" },
  { value: "math.NA", label: "math.NA — Numerical Analysis" },
  { value: "math.OA", label: "math.OA — Operator Algebras" },
  { value: "math.OC", label: "math.OC — Optimization and Control" },
  { value: "math.PR", label: "math.PR — Probability" },
  { value: "math.QA", label: "math.QA — Quantum Algebra" },
  { value: "math.RT", label: "math.RT — Representation Theory" },
  { value: "math.RA", label: "math.RA — Rings and Algebras" },
  { value: "math.SP", label: "math.SP — Spectral Theory" },
  { value: "math.ST", label: "math.ST — Statistics Theory" },
  { value: "math.SG", label: "math.SG — Symplectic Geometry" },
];

function CustomSelect({
  value,
  onChange,
  options,
  fullWidth,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  fullWidth?: boolean;
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
    <div className={`relative${fullWidth ? " w-full" : ""}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-gray-500 cursor-pointer flex items-center gap-2 whitespace-nowrap${fullWidth ? " w-full justify-between" : ""}`}
      >
        <span className={!selected || selected.value === "" ? "text-gray-400" : ""}>{selected?.label ?? value}</span>
        <span className="text-gray-400 text-xs select-none flex-shrink-0">▾</span>
      </button>
      {open && (
        <div className="absolute z-10 top-full left-0 mt-0.5 border border-gray-300 bg-white shadow-sm min-w-full max-h-64 overflow-y-auto">
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
  lookup_orcid: string;
  linked_user_id: string;
  linked_user_name: string;
}

const emptyAuthor = (): AuthorRow => ({
  name: "",
  author_type: "human",
  model_id: "",
  lookup_orcid: "",
  linked_user_id: "",
  linked_user_name: "",
});

function AuthorRowItem({
  author,
  index,
  onChange,
  onLookup,
  onRemove,
  canRemove,
}: {
  author: AuthorRow;
  index: number;
  onChange: (i: number, field: keyof AuthorRow, value: string) => void;
  onLookup: (i: number, orcidId: string) => void;
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
      {!isAI && (
        <div className="flex items-center gap-2">
          <input
            className="flex-1 border border-gray-200 px-3 py-1 text-xs focus:outline-none focus:border-gray-400 text-gray-600 placeholder-gray-300"
            placeholder="Link account by ORCID iD (optional, e.g. 0000-0002-1825-0097)"
            value={author.lookup_orcid}
            onChange={(e) => onChange(index, "lookup_orcid", e.target.value)}
            onBlur={(e) => { if (e.target.value.trim()) onLookup(index, e.target.value.trim()); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (author.lookup_orcid.trim()) onLookup(index, author.lookup_orcid.trim()); } }}
          />
          {author.linked_user_id && (
            <span className="text-xs text-green-600 whitespace-nowrap">✓ {author.linked_user_name}</span>
          )}
          {!author.linked_user_id && author.lookup_orcid && (
            <span className="text-xs text-red-400 whitespace-nowrap">not found</span>
          )}
        </div>
      )}
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

  useEffect(() => {
    if (user && !parentId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthors((prev) =>
        prev.length === 1 && !prev[0].name
          ? [{ name: user.name, author_type: "human", model_id: "", lookup_orcid: "", linked_user_id: "", linked_user_name: "" }]
          : prev
      );
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
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
          lookup_orcid: "",
          linked_user_id: "",
          linked_user_name: "",
        }))
      );
    }).catch(() => {});
  }, [parentId]);

  function updateAuthor(i: number, field: keyof AuthorRow, value: string) {
    setAuthors((prev) => prev.map((a, idx) => {
      if (idx !== i) return a;
      const updated = { ...a, [field]: value };
      if (field === "lookup_orcid") updated.linked_user_id = "";
      return updated;
    }));
  }

  async function handleLookup(i: number, orcidId: string) {
    try {
      const u = await lookupUserByOrcid(orcidId);
      setAuthors((prev) => prev.map((a, idx) =>
        idx === i ? { ...a, linked_user_id: u.id, linked_user_name: u.name } : a
      ));
    } catch {
      setAuthors((prev) => prev.map((a, idx) =>
        idx === i ? { ...a, linked_user_id: "", linked_user_name: "" } : a
      ));
    }
  }

  function removeAuthor(i: number) {
    setAuthors((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pdf) { setError("Please select a PDF file."); return; }
    if (!token) { setError("Not authenticated. Please sign in again."); return; }
    if (!subjectArea) { setError("Please select a subject area."); return; }
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
            user_id: a.linked_user_id || undefined,
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
            + add AI tool disclosure certificate
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
          <CustomSelect
            value={subjectArea}
            onChange={setSubjectArea}
            options={SUBJECT_OPTIONS}
            fullWidth
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Authors</label>
          {authors.map((a, i) => (
            <AuthorRowItem
              key={i}
              author={a}
              index={i}
              onChange={updateAuthor}
              onLookup={handleLookup}
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
