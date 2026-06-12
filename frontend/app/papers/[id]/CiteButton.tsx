"use client";

import { useState } from "react";

export default function CiteButton({ bibtex }: { bibtex: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(bibtex).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="text-sm text-gray-500 hover:text-gray-900 underline transition-colors"
      title="Copy BibTeX citation"
    >
      {copied ? "Copied!" : "Cite (BibTeX)"}
    </button>
  );
}
