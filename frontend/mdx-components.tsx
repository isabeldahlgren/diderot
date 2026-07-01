import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import { readFileSync } from "fs";
import path from "path";
import { parseBib, type BibEntry } from "./app/about/parseBib";

function getRefs(): BibEntry[] {
  const bib = readFileSync(
    path.join(process.cwd(), "app/about/references.bib"),
    "utf-8"
  );
  return parseBib(bib);
}

function Cite({ id }: { id: string }) {
  const refs = getRefs();
  const idx = refs.findIndex((r) => r.key === id);
  if (idx === -1) return <span className="text-red-400 text-xs">[?{id}]</span>;
  return (
    <a href={`#ref-${idx + 1}`} className="text-gray-400 hover:text-gray-700">
      [{idx + 1}]
    </a>
  );
}

function References() {
  const refs = getRefs();
  return (
    <section id="references">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3 mt-8">
        References
      </h3>
      <p className="text-sm leading-relaxed text-gray-800 mb-4">
        Curated lists of references can be found on the websites of {" "}
        <a href="https://www.math.columbia.edu/~woit/wordpress/?p=15672" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-900">
          Peter Woit
        </a>
        {" "} and {" "}
        <a href="http://www.thomasbloom.org/AIlinks.html" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-900">
          Thomas Bloom
        </a>
        .
      </p>
      <ol className="space-y-2">
        {refs.map((ref, i) => {
          const italicTitle = ref.type !== "article";
          const titleNode = italicTitle ? <em>{ref.title}</em> : <>{ref.title}</>;
          return (
            <li key={ref.key} id={`ref-${i + 1}`} className="flex gap-2.5 text-sm leading-relaxed text-gray-800">
              <span className="text-gray-400 shrink-0 tabular-nums">[{i + 1}]</span>
              <span>
                {ref.author && <>{ref.author}, </>}
                {ref.url ? (
                  <a href={ref.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-900">
                    {titleNode}
                  </a>
                ) : titleNode}
                {ref.venue && (
                  ref.type === "article"
                    ? <>, <em>{ref.venue}</em></>
                    : <>, {ref.venue}</>
                )}
                {ref.year && <>, {ref.month ? `${ref.month} ` : ""}{ref.year}</>}
                {ref.doi && (
                  <>, <a href={`https://doi.org/${ref.doi}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-900">doi:{ref.doi}</a></>
                )}
                {ref.note && <>, {ref.note}</>}
                {"."}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function CustomLink({ href, children, ...props }: React.ComponentPropsWithoutRef<"a">) {
  if (href?.startsWith("/")) {
    return (
      <Link href={href} className="underline hover:text-gray-900">
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className="underline hover:text-gray-900" target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    h1: ({ children }) => (
      <h1 className="text-2xl font-semibold mb-6">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-lg font-semibold mt-10 mb-3">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2 mt-8">
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p className="text-sm leading-relaxed text-gray-800 mb-4">{children}</p>
    ),
    a: CustomLink,
    ul: ({ children }) => (
      <ul className="mt-2 mb-4 space-y-1 ml-4 text-sm leading-relaxed text-gray-800 list-disc">
        {children}
      </ul>
    ),
    li: ({ children }) => <li>{children}</li>,
    hr: () => <hr className="border-gray-200 mt-10 mb-6" />,
    strong: ({ children }) => <strong className="font-medium">{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
    // Custom components available in all MDX files
    Cite,
    References,
  };
}
