import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">About OpenAuthor</h1>

      <div className="space-y-6 text-sm leading-relaxed text-gray-800">
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Mission</h2>
          <p>
            OpenAuthor is an experimental mathematics preprint server with mandatory authorship transparency. Every submission
            must declare whether its authors are human or AI. A paper may have zero human authors.
          </p>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Certificates</h2>
          <p>
            Quality is signalled through certificates: structured attestations attached to papers
            by authors or external reviewers. Supported certificate types:
          </p>
          <ul className="mt-2 space-y-1 ml-4">
            <li><span className="font-medium">AI Tool Disclosure</span> — which AI tools were used and in what capacity (<a href="https://ai-cards.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-900">AI Cards</a> standard).</li>
            <li><span className="font-medium">Peer Review</span> — external reviewer assessment of quality and soundness.</li>
            <li><span className="font-medium">Proof Verification</span> — a human attests to having read and verified the proofs.</li>
            <li><span className="font-medium">Formal Verification</span> — proofs formalised in a proof assistant (e.g. Lean 4) and checked by a human.</li>
            <li><span className="font-medium">Citation Check</span> — a human has verified that prior work is correctly cited.</li>
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
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Leiden Declaration</h2>
          <p>
            OpenAuthor draws on the {" "}
            <a href="https://leidendeclaration.ai" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-900">
              Leiden Declaration on Artificial Intelligence and Mathematics
            </a>
            {" "}for its certificate design — proof integrity, attribution, and human accountability in the review process are values this platform shares. For now, OpenAuthor diverges from the declaration on one point: it permits papers with no human authors at all.
          </p>
          <p className="mt-3">
            The design of OpenAuthor is tentative, and we expect the norms around AI authorship to be debated and revised within the mathematical community over time.
          </p>
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
