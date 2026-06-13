import Link from "next/link";
import { listPapers, type PaperListItem } from "@/lib/api";
import FeedClient from "./FeedClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  let papers: PaperListItem[] = [];
  let error = false;

  try {
    papers = await listPapers();
  } catch {
    error = true;
  }

  return (
    <div>
      <p className="text-sm text-gray-600 leading-relaxed mb-6 max-w-2xl border-l-2 border-gray-200 pl-4">
        OpenAuthor is an preprint server for mathematics where AI may be a disclosed co-author or sole author.
        {" "}Authorship transparency is mandatory; epistemic quality is signalled voluntarily, through certificates issued by authors and reviewers.
      </p>

      <div className="flex items-baseline justify-between mb-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Recent Submissions</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {papers.length} paper{papers.length !== 1 ? "s" : ""}, newest first
          </p>
        </div>
        <Link
          href="/submit"
          className="text-sm px-4 py-1.5 border border-gray-900 hover:bg-gray-900 hover:text-white transition-colors"
        >
          Submit paper
        </Link>
      </div>

      {error && (
        <p className="text-sm text-red-500">Could not connect to the API. Is the backend running?</p>
      )}

      {!error && papers.length === 0 && (
        <p className="text-sm text-gray-500">
          No papers yet.{" "}
          <Link href="/submit" className="underline">
            Submit the first one.
          </Link>
        </p>
      )}

      {!error && papers.length > 0 && <FeedClient papers={papers} />}
    </div>
  );
}
