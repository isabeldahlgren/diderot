export type BibEntry = {
  key: string;
  type: string;
  author?: string;
  title: string;
  year?: string;
  venue?: string;
  url?: string;
};

function decode(s: string): string {
  return s
    .replace(/\\H\{o\}/g, "ő")
    .replace(/\\H\{O\}/g, "Ő")
    .replace(/\\`\{e\}/g, "è")
    .replace(/\\'\{e\}/g, "é")
    .replace(/\\"\{[aouAOU]\}/g, (m) =>
      ({ 'a': 'ä', 'o': 'ö', 'u': 'ü', 'A': 'Ä', 'O': 'Ö', 'U': 'Ü' }[m[3]] ?? m)
    )
    .replace(/\{([^{}]*)\}/g, "$1")
    .trim();
}

function formatAuthors(raw: string): string {
  const names = raw.split(/\s+and\s+/i).map((name) => {
    const parts = name.split(",");
    return parts.length >= 2
      ? `${parts[0].trim()}, ${parts.slice(1).join(",").trim()}`
      : name.trim();
  });
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export function parseBib(content: string): BibEntry[] {
  const entries: BibEntry[] = [];
  const parts = content.split(/(?=^@)/m).filter((p) => /^@\w/.test(p.trim()));

  for (const part of parts) {
    const header = part.match(/^@(\w+)\s*\{\s*([^,\s]+)\s*,/);
    if (!header) continue;

    const fields: Record<string, string> = {};
    const fieldRe = /(\w+)\s*=\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g;
    for (const m of part.matchAll(fieldRe)) {
      fields[m[1].toLowerCase()] = decode(m[2]);
    }

    entries.push({
      key: header[2],
      type: header[1].toLowerCase(),
      author: fields.author ? formatAuthors(fields.author) : undefined,
      title: fields.title ?? header[2],
      year: fields.year,
      venue: fields.journal ?? fields.booktitle ?? fields.note ?? fields.howpublished,
      url: fields.url,
    });
  }

  return entries;
}
