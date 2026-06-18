"use client";

import { useAuth } from "@/lib/auth";
import { getOrcidLinkUrl } from "@/lib/api";

export function ProfileActions({ userId, hasOrcid }: { userId: string; hasOrcid: boolean }) {
  const { user, token } = useAuth();

  if (!user || user.id !== userId) return null;

  if (hasOrcid) return null;

  async function handleLink() {
    if (!token) return;
    try {
      const { url } = await getOrcidLinkUrl(token);
      window.location.href = url;
    } catch {
      alert("Could not start ORCID linking. Please try again.");
    }
  }

  return (
    <button
      onClick={handleLink}
      className="inline-flex items-center gap-1 text-xs border border-gray-300 px-2 py-0.5 hover:border-gray-600 hover:text-gray-700 transition-colors"
    >
      <span className="text-green-600 font-bold">iD</span>
      Link ORCID iD
    </button>
  );
}
