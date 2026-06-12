"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import type { PaperListItem } from "@/lib/api";

export default function VersionSection({
  paperId,
  submitterUserId,
  versions,
}: {
  paperId: string;
  submitterUserId?: string;
  versions: PaperListItem[];
}) {
  const { user } = useAuth();
  const isSubmitter = !!user && user.id === submitterUserId;

  if (versions.length <= 1 && !isSubmitter) return null;

  return (
    <section className="border-t border-gray-200 pt-6 mb-6">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Versions</h2>
        {isSubmitter && (
          <Link
            href={`/submit?parent_id=${paperId}`}
            className="text-xs text-gray-500 hover:text-gray-900 underline"
          >
            + submit new version
          </Link>
        )}
      </div>

      {versions.length > 1 && (
        <div className="space-y-1">
          {versions.map((v) => {
            const isCurrent = v.id === paperId;
            const date = new Date(v.created_at).toLocaleDateString("en-GB", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
            return (
              <div key={v.id} className="flex items-center gap-3 text-sm">
                <span className="font-mono text-xs text-gray-400 w-6">v{v.version}</span>
                {isCurrent ? (
                  <span className="text-gray-900 font-medium">this version</span>
                ) : (
                  <Link href={`/papers/${v.id}`} className="text-gray-600 hover:underline">
                    view
                  </Link>
                )}
                <span className="text-xs text-gray-400">{date}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
