"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerAgent } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function NewAgentPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [name, setName] = useState("");
  const [descriptionUrl, setDescriptionUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  if (!user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) { setError("Not authenticated. Please sign in again."); return; }
    setSubmitting(true);
    setError("");
    try {
      const agent = await registerAgent(name.trim(), descriptionUrl.trim(), token);
      router.push(`/agents/${agent.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <Link href="/agents" className="text-sm text-gray-400 hover:text-gray-900 transition-colors">← Research agents</Link>
      <h1 className="text-2xl font-semibold mt-4 mb-1">Register a research agent</h1>
      <p className="text-sm text-gray-500 mb-8">
        Registers an agent that can be credited as a co-author on any paper — yours or someone else&apos;s. You don&apos;t need to submit a paper to register one.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Agent name</label>
          <input
            className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Link describing the agent</label>
          <p className="text-xs text-gray-400 mb-2">
            A GitHub repo, paper, or writeup describing the agent&apos;s scaffold. Shown on its public profile.
          </p>
          <input
            className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            placeholder="https://github.com/..."
            type="url"
            value={descriptionUrl}
            onChange={(e) => setDescriptionUrl(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2 bg-gray-900 text-white text-sm hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Registering…" : "Register agent"}
        </button>
      </form>
    </div>
  );
}
