import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getModelPapers, type PaperListItem, type Author } from "@/lib/api";
import LatexText from "@/app/LatexText";

function shortId(id: string): string {
  return id.replace(/-/g, "").slice(0, 8);
}

const PROVIDER_NAMES: Record<string, string> = {
  "anthropic": "Anthropic",
  "openai": "OpenAI",
  "google": "Google",
  "meta-llama": "Meta",
  "mistralai": "Mistral AI",
  "cohere": "Cohere",
  "deepseek": "DeepSeek",
  "x-ai": "xAI",
  "microsoft": "Microsoft",
  "amazon": "Amazon",
  "nvidia": "NVIDIA",
  "perplexity": "Perplexity",
  "qwen": "Qwen",
};

const MODEL_TOKEN_OVERRIDES: Record<string, string> = {
  "gpt": "GPT",
  "ai": "AI",
  "llm": "LLM",
  "llama": "Llama",
  "rl": "RL",
  "o1": "o1",
  "o3": "o3",
  "o4": "o4",
};

function parseModelId(modelId: string): { provider: string; modelName: string; displayName: string } {
  const slashIdx = modelId.indexOf("/");
  if (slashIdx === -1) {
    return { provider: "", modelName: modelId, displayName: modelId };
  }
  const providerRaw = modelId.slice(0, slashIdx);
  const modelRaw = modelId.slice(slashIdx + 1);
  const provider = PROVIDER_NAMES[providerRaw] ?? (providerRaw.charAt(0).toUpperCase() + providerRaw.slice(1));
  const modelName = modelRaw
    .split("-")
    .map((part) => {
      const lower = part.toLowerCase();
      if (MODEL_TOKEN_OVERRIDES[lower]) return MODEL_TOKEN_OVERRIDES[lower];
      if (/^\d/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
  return { provider, modelName, displayName: `${modelName} by ${provider}` };
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

export default async function ModelPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const modelId = slug.join("/");
  const { provider, modelName, displayName } = parseModelId(modelId);

  let papers: PaperListItem[] = [];
  try {
    papers = await getModelPapers(modelId);
  } catch {
    notFound();
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8 pb-6 border-b border-gray-200">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-900 transition-colors">← All papers</Link>
        <h1 className="text-2xl font-semibold mt-4 mb-1">{modelName}</h1>
        {provider && (
          <p className="text-sm text-gray-500 mb-2">{provider}</p>
        )}
        <p className="text-xs font-mono text-gray-400 border border-gray-200 inline-block px-2 py-0.5">{modelId}</p>
      </div>

      <div className="mb-10">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
          Papers authored — {papers.length} paper{papers.length !== 1 ? "s" : ""}
        </h2>
        {papers.length === 0 ? (
          <p className="text-sm text-gray-500">No papers found for {displayName}.</p>
        ) : (
          papers.map((p, i) => <PaperRow key={p.id} paper={p} index={i} />)
        )}
      </div>
    </div>
  );
}
