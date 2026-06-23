"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getComments, addComment as apiAddComment, editComment as apiEditComment, type Comment } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import LatexText from "@/app/LatexText";

function EditHistory({ comment }: { comment: Comment }) {
  const [open, setOpen] = useState(false);
  if (!comment.edited_at) return null;
  const editedDate = new Date(comment.edited_at).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return (
    <span className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-gray-400 hover:text-gray-600 ml-1"
        title="Show edit history"
      >
        (edited {editedDate})
      </button>
      {open && !!comment.edit_history?.length && (
        <div className="absolute z-10 left-0 mt-1 w-80 bg-white border border-gray-200 shadow-lg p-3 text-xs text-gray-700">
          <p className="font-semibold mb-2 uppercase tracking-wide text-gray-400 text-[10px]">Edit history</p>
          {comment.edit_history.map((entry, i) => (
            <div key={i} className="mb-2 border-b border-gray-100 pb-2 last:border-0 last:mb-0 last:pb-0">
              <p className="text-gray-400 mb-0.5">
                {new Date(entry.edited_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
              </p>
              <LatexText text={entry.body} />
            </div>
          ))}
        </div>
      )}
    </span>
  );
}

function CommentItem({
  comment,
  currentUserId,
  token,
  onUpdated,
}: {
  comment: Comment;
  currentUserId?: string;
  token?: string;
  onUpdated: (updated: Comment) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isOwner = !!currentUserId && comment.author_user_id === currentUserId;

  const date = new Date(comment.created_at).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  async function handleSave() {
    if (!token || !draft.trim()) return;
    setSaving(true);
    setError("");
    try {
      const updated = await apiEditComment(comment.paper_id, comment.id, draft.trim(), token);
      onUpdated(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDraft(comment.body);
    setEditing(false);
    setError("");
  }

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
        <EditHistory comment={comment} />
        {isOwner && !editing && (
          <button
            onClick={() => { setDraft(comment.body); setEditing(true); }}
            className="text-xs text-gray-400 hover:text-gray-600 ml-auto"
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div>
          <textarea
            className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500 resize-none"
            rows={4}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSave}
              disabled={saving || !draft.trim()}
              className="px-3 py-1 bg-gray-900 text-white text-xs hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-3 py-1 border border-gray-300 text-xs hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <LatexText text={comment.body} className="text-sm text-gray-800 leading-relaxed" />
      )}
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

  function handleUpdated(updated: Comment) {
    setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

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
            <CommentItem
              key={c.id}
              comment={c}
              currentUserId={user?.id}
              token={token ?? undefined}
              onUpdated={handleUpdated}
            />
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
