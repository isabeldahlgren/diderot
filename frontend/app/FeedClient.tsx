"use client";

import { useState, useMemo, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import type { PaperListItem, Author } from "@/lib/api";
import LatexText from "@/app/LatexText";

function shortId(id: string): string {
  return id.replace(/-/g, "").slice(0, 8);
}

function SubjectSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
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

  const label = value === "all" ? "All subjects" : value;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="border border-gray-200 px-2.5 py-1 text-xs bg-white focus:outline-none cursor-pointer flex items-center gap-1.5 whitespace-nowrap text-gray-600"
      >
        {label}
        <span className="text-gray-400 text-[10px] select-none">▾</span>
      </button>
      {open && (
        <div className="absolute z-10 top-full left-0 mt-0.5 border border-gray-200 bg-white shadow-sm min-w-full max-h-64 overflow-y-auto">
          {["all", ...options].map((opt) => {
            const optLabel = opt === "all" ? "All subjects" : opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${
                  opt === value ? "text-gray-900 font-medium" : "text-gray-600"
                }`}
              >
                {optLabel}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AuthorList({ authors, anonymous }: { authors: Author[]; anonymous?: boolean }) {
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
        <Link key={a.id} href={a.agent_id ? `/agents/${a.agent_id}` : `/models/${a.name}`} className="text-purple-600 hover:underline">
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
        <AuthorList authors={paper.authors} anonymous={paper.is_anonymous} />
      </p>

      <p className="text-sm text-gray-500 line-clamp-2 mb-2 leading-relaxed">
        <LatexText text={paper.abstract} />
      </p>

      <div className="flex gap-4 text-xs text-gray-400">
        <span>Submitted {date}</span>
        {paper.is_anonymous ? (
          <span>by Anonymous</span>
        ) : paper.submitter_user_id ? (
          <span>
            by{" "}
            <Link
              href={`/authors/${paper.submitter_user_id}`}
              className="text-gray-700 font-medium hover:underline"
            >
              {paper.submitter_name ?? "unknown"}
            </Link>
          </span>
        ) : null}
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

type AuthorshipFilter = "all" | "human_only" | "ai_involved";
type CertFilter = "any" | "has_certs";
type SortOrder = "newest" | "most_certs";

function matchesQuery(paper: PaperListItem, query: string): boolean {
  const searchableAuthors = paper.is_anonymous
    ? paper.authors.filter((a) => a.author_type === "ai")
    : paper.authors;
  const haystack = [paper.title, paper.abstract, ...searchableAuthors.map((a) => a.name)]
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

export default function FeedClient({ papers }: { papers: PaperListItem[] }) {
  const [authorship, setAuthorship] = useState<AuthorshipFilter>("all");
  const [subject, setSubject] = useState("all");
  const [certFilter, setCertFilter] = useState<CertFilter>("any");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [query, setQuery] = useState("");

  const subjects = useMemo(() => {
    const seen = new Set<string>();
    return papers.map((p) => p.subject_area).filter((s) => s && !seen.has(s) && seen.add(s));
  }, [papers]);

  const filtered = useMemo(() => {
    const result = papers.filter((p) => {
      const hasAI = p.authors.some((a) => a.author_type === "ai");
      if (authorship === "human_only" && hasAI) return false;
      if (authorship === "ai_involved" && !hasAI) return false;
      if (subject !== "all" && p.subject_area !== subject) return false;
      if (certFilter === "has_certs" && p.certificate_count === 0) return false;
      if (query.trim() && !matchesQuery(p, query)) return false;
      return true;
    });
    if (sortOrder === "most_certs") {
      return [...result].sort((a, b) => b.certificate_count - a.certificate_count);
    }
    return [...result].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [papers, authorship, subject, certFilter, sortOrder, query]);

  return (
    <div>
      <div className="mb-6 border-b border-gray-100 py-3 flex flex-col gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, authors, or abstract…"
          className="w-full max-w-md border border-gray-200 px-3 py-1.5 text-sm placeholder:text-gray-400 focus:outline-none focus:border-gray-400"
        />
        <div className="flex flex-wrap gap-x-6 gap-y-2 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Authorship</span>
            <div className="flex border border-gray-200 divide-x divide-gray-200">
              {(
                [
                  { v: "all", label: "All" },
                  { v: "human_only", label: "Human only" },
                  { v: "ai_involved", label: "With AI" },
                ] as { v: AuthorshipFilter; label: string }[]
              ).map(({ v, label }) => (
                <button
                  key={v}
                  onClick={() => setAuthorship(v)}
                  className={`px-2.5 py-1 text-xs transition-colors ${
                    authorship === v
                      ? "bg-gray-900 text-white"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Certificates</span>
            <div className="flex border border-gray-200 divide-x divide-gray-200">
              {(
                [
                  { v: "any", label: "Any" },
                  { v: "has_certs", label: "Has certificates" },
                ] as { v: CertFilter; label: string }[]
              ).map(({ v, label }) => (
                <button
                  key={v}
                  onClick={() => setCertFilter(v)}
                  className={`px-2.5 py-1 text-xs transition-colors ${
                    certFilter === v
                      ? "bg-gray-900 text-white"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Sort</span>
            <div className="flex border border-gray-200 divide-x divide-gray-200">
              {(
                [
                  { v: "newest", label: "Newest" },
                  { v: "most_certs", label: "Most certificates" },
                ] as { v: SortOrder; label: string }[]
              ).map(({ v, label }) => (
                <button
                  key={v}
                  onClick={() => setSortOrder(v)}
                  className={`px-2.5 py-1 text-xs transition-colors ${
                    sortOrder === v
                      ? "bg-gray-900 text-white"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {subjects.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Subject</span>
            <SubjectSelect value={subject} onChange={setSubject} options={subjects} />
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500">No papers match the current filters.</p>
      ) : (
        filtered.map((p, i) => <PaperRow key={p.id} paper={p} index={i} />)
      )}
    </div>
  );
}
