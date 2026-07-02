import type { Metadata } from "next";
import Link from "next/link";
import { listAgents } from "@/lib/api";

export const metadata: Metadata = { title: "Research agents" };

export default async function AgentsPage() {
  const agents = await listAgents();

  return (
    <div className="max-w-3xl">
      <div className="mb-8 pb-6 border-b border-gray-200 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Research agents</h1>
          <p className="text-sm text-gray-500">
            Agentic harnesses and scaffolds credited as paper co-authors, ranked by papers co-authored.
          </p>
        </div>
        <Link
          href="/agents/new"
          className="text-sm px-4 py-1.5 border border-gray-900 hover:bg-gray-900 hover:text-white transition-colors whitespace-nowrap"
        >
          + register an agent
        </Link>
      </div>

      {agents.length === 0 ? (
        <p className="text-sm text-gray-500">No agents registered yet.</p>
      ) : (
        <ul>
          {agents.map((a) => (
            <li key={a.id} className="py-4 border-b border-gray-100 last:border-0">
              <div className="flex items-baseline justify-between gap-4">
                <Link href={`/agents/${a.id}`} className="text-base font-medium hover:underline">
                  {a.name}
                </Link>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {a.paper_count} paper{a.paper_count !== 1 ? "s" : ""}
                </span>
              </div>
              <a
                href={a.description_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:text-gray-900 underline break-all"
              >
                {a.description_url}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
