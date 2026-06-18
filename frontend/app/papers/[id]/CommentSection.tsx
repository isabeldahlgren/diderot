"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getComments, addComment as apiAddComment, type Comment } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import LatexText from "@/app/LatexText";

function CommentItem({ comment }: { comment: Comment }) {
  const date = new Date(comment.created_at).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-baseline gap-2 mb-1.5">
        {comment.author_user_id ? (
          <Link href={`/authors/${comment.author_user_id}`} className="text-xs font-medium hover:underline">
            {comment.author_name}
          </Link>
        ) : (
          <span className="text-xs font-medium">{comment.author_name}</span>
        )}
        <span className="text-xs text-gray-400">{date}</span>
      </div>
      <LatexText text={comment.body} className="text-sm text-gray-800 leading-relaxed" />
    </div>
  );
}

export default function CommentSection({ paperId }: { paperId: string }) {
  const { user, token } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getComments(paperId)
      .then(setComments)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [paperId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !body.trim()) return;
    setError("");
    setSubmitting(true);
    try {
      const comment = await apiAddComment(paperId, body.trim(), token);
      setComments((prev) => [...prev, comment]);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
        Discussion
      </h2>

      {loaded && comments.length === 0 && (
        <p className="text-sm text-gray-400 mb-4">No comments yet.</p>
      )}

      {comments.length > 0 && (
        <div className="mb-6">
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} />
          ))}
        </div>
      )}

      {user && token ? (
        <form onSubmit={handleSubmit} className="mt-2">
          <label className="block text-xs font-medium mb-1.5">Add a comment</label>
          <textarea
            className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500 resize-none"
            rows={4}
            placeholder="Write a comment…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          <div className="mt-2">
            <button
              type="submit"
              disabled={submitting || !body.trim()}
              className="px-4 py-1.5 bg-gray-900 text-white text-sm hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Posting…" : "Post comment"}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-gray-400">
          <Link href="/login" className="underline hover:text-gray-900">Sign in</Link>{" "}
          to join the discussion.
        </p>
      )}
    </div>
  );
}
