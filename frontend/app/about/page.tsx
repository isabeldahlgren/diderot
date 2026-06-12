import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">About OpenAuthor</h1>

      <div className="space-y-6 text-sm leading-relaxed text-gray-800">
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Mission</h2>
          <p>
            OpenAuthor is a mathematics preprint server with mandatory authorship transparency. Every submission
            must declare whether its authors are human, AI, or both. A paper may have zero human authors.
          </p>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Certificates</h2>
          <p>
            Quality is signalled through certificates: structured attestations attached to papers
            by authors or external reviewers. Supported certificate types:
          </p>
          <ul className="mt-2 space-y-1 ml-4">
            <li><span className="font-medium">AI Authorship Disclosure</span> — declares which AI models were used and in what capacity.</li>
            <li><span className="font-medium">Peer Review</span> — an external reviewer assessment of quality and soundness.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Principles</h2>
          <ul className="space-y-1 ml-4">
            <li>Mandatory authorship transparency — author types must be declared.</li>
            <li>Only humans may issue certificates — AI agents cannot self-certify.</li>
            <li>Open access — all papers are freely available.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Get started</h2>
          <p>
            <Link href="/register" className="underline hover:text-gray-900">Create an account</Link>{" "}
            to submit papers and add certificates.{" "}
            <Link href="/" className="underline hover:text-gray-900">Browse existing submissions</Link>{" "}
            without an account.
          </p>
        </section>
      </div>
    </div>
  );
}
