import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAgent, getAgentPapers, type PaperListItem, type Author } from "@/lib/api";
import LatexText from "@/app/LatexText";

function shortId(id: string): string {
  return id.replace(/-/g, "").slice(0, 8);
}

function formatAuthors(authors: Author[], anonymous?: boolean): ReactNode {
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
        <Link key={a.id} href={a.agent_id ? `/agents/${a.agent_id}` : `/models/${a.name}`} className="text-purple-700 hover:underline">
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

  return (
    <article className="py-5 border-b border-gray-100 last:border-0">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-xs text-gray-400 font-mono whitespace-nowrap">[{index + 1}] OA:{shortId(paper.id)}</span>
        <span className="text-xs text-gray-500 border border-gray-200 px-1.5 py-0.5 leading-tight">{paper.subject_area}</span>
        {paper.version > 1 && (
          <span className="text-xs text-gray-400 font-mono">v{paper.version}</span>
        )}
      </div>
      <Link href={`/papers/${paper.id}`} className="group">
        <h2 className="text-base font-medium group-hover:underline leading-snug mb-1">{paper.title}</h2>
      </Link>
      <p className="text-sm text-gray-600 mb-1">
        {formatAuthors(paper.authors, paper.is_anonymous)}
      </p>
      <p className="text-sm text-gray-500 line-clamp-2 mb-2 leading-relaxed"><LatexText text={paper.abstract} /></p>
      <div className="flex gap-4 text-xs text-gray-400">
        <span>Submitted {date}</span>
        {paper.certificate_count > 0 && (
          <span className="text-green-700">{paper.certificate_count} certificate{paper.certificate_count !== 1 ? "s" : ""}</span>
        )}
      </div>
    </article>
  );
}

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let agent;
  let papers: PaperListItem[] = [];
  try {
    [agent, papers] = await Promise.all([getAgent(id), getAgentPapers(id)]);
  } catch {
    notFound();
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8 pb-6 border-b border-gray-200">
        <Link href="/agents" className="text-sm text-gray-400 hover:text-gray-900 transition-colors">← Research agents</Link>
        <h1 className="text-2xl font-semibold mt-4 mb-1">{agent.name}</h1>
        <span className="text-xs text-purple-600 border border-purple-200 px-1.5 py-0.5 leading-tight bg-purple-50 inline-block mb-2">
          AI agent
        </span>
        <p className="text-sm text-gray-500">
          <a
            href={agent.description_url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-900 break-all"
          >
            {agent.description_url}
          </a>
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Registered {new Date(agent.created_at).toLocaleDateString("en-GB", { year: "numeric", month: "long" })}
        </p>
      </div>

      <div className="mb-10">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
          Papers authored — {papers.length} paper{papers.length !== 1 ? "s" : ""}
        </h2>
        {papers.length === 0 ? (
          <p className="text-sm text-gray-500">No papers found for {agent.name}.</p>
        ) : (
          papers.map((p, i) => <PaperRow key={p.id} paper={p} index={i} />)
        )}
      </div>
    </div>
  );
}
