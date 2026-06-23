"use client";

import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

type Segment =
  | { kind: "text"; content: string }
  | { kind: "math"; content: string; display: boolean };

function parse(text: string): Segment[] {
  const segments: Segment[] = [];
  // Priority: $$...$$ and \[...\] (display), then \(...\) and $...$ (inline)
  const re = /\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)|\$((?:[^$\\]|\\.)*?)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push({ kind: "text", content: text.slice(last, m.index) });
    if (m[1] !== undefined) {
      segments.push({ kind: "math", content: m[1], display: true });
    } else if (m[2] !== undefined) {
      segments.push({ kind: "math", content: m[2], display: true });
    } else if (m[3] !== undefined) {
      segments.push({ kind: "math", content: m[3], display: false });
    } else {
      segments.push({ kind: "math", content: m[4], display: false });
    }
    last = re.lastIndex;
  }
  if (last < text.length) segments.push({ kind: "text", content: text.slice(last) });
  return segments;
}

function renderMath(content: string, display: boolean): string {
  try {
    return katex.renderToString(content, { displayMode: display, throwOnError: false });
  } catch {
    return content;
  }
}

export default function LatexText({ text, className }: { text: string; className?: string }) {
  const segments = useMemo(() => parse(text), [text]);

  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.kind === "text" ? (
          <span key={i} style={{ whiteSpace: "pre-wrap" }}>{seg.content}</span>
        ) : (
          <span
            key={i}
            dangerouslySetInnerHTML={{ __html: renderMath(seg.content, seg.display) }}
            style={seg.display ? { display: "block", textAlign: "center", margin: "0.5em 0" } : undefined}
          />
        )
      )}
    </span>
  );
}
