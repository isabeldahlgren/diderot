export type BibEntry = {
  key: string;
  type: string;
  author?: string;
  title: string;
  year?: string;
  month?: string;
  venue?: string;
  url?: string;
  doi?: string;
  note?: string;
};

function decode(s: string): string {
  return s
    .replace(/\\H\{o\}/g, "ő")
    .replace(/\\H\{O\}/g, "Ő")
    .replace(/\\`\{e\}/g, "è")
    .replace(/\\'\{e\}/g, "é")
    .replace(/\\"\{[aouAOU]\}/g, (m) =>
      ({ a: "ä", o: "ö", u: "ü", A: "Ä", O: "Ö", U: "Ü" }[m[3]] ?? m)
    )
    .replace(/\{([^{}]*)\}/g, "$1")
    .trim();
}

const MONTH_ABBR: Record<string, string> = {
  jan: "Jan.", feb: "Feb.", mar: "Mar.", apr: "Apr.",
  may: "May",  jun: "Jun.", jul: "Jul.", aug: "Aug.",
  sep: "Sep.", oct: "Oct.", nov: "Nov.", dec: "Dec.",
};

function abbreviateName(name: string): string {
  const comma = name.indexOf(",");
  if (comma !== -1) {
    const last = name.slice(0, comma).trim();
    const first = name.slice(comma + 1).trim();
    const initials = first.split(/\s+/).filter(Boolean).map((w) => w[0] + ".").join(" ");
    return `${initials} ${last}`;
  }
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    const last = words[words.length - 1];
    const initials = words.slice(0, -1).map((w) => w[0] + ".").join(" ");
    return `${initials} ${last}`;
  }
  return name.trim();
}

function formatAuthors(raw: string): string {
  const parts = raw.split(/\s+and\s+/i);
  const hasOthers = parts[parts.length - 1].trim().toLowerCase() === "others";
  const names = (hasOthers ? parts.slice(0, -1) : parts).map((n) =>
    abbreviateName(n)
  );

  if (hasOthers || names.length > 6) {
    return `${names[0]} et al.`;
  }
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function extractUrl(raw: string): { venue?: string; url?: string } {
  const m = raw.match(/\\url\{([^}]+)\}/);
  if (!m) return { venue: raw || undefined };
  const url = m[1];
  const rest = raw.replace(/,?\s*\\url\{[^}]+\}/, "").trim();
  return { venue: rest ? decode(rest) : undefined, url };
}

export function parseBib(content: string): BibEntry[] {
  const entries: BibEntry[] = [];
  const parts = content.split(/(?=^@)/m).filter((p) => /^@\w/.test(p.trim()));

  for (const part of parts) {
    const header = part.match(/^@(\w+)\s*\{\s*([^,\s]+)\s*,/);
    if (!header) continue;

    // Extract raw (undecoded) field values — supports 3 levels of brace nesting
    const rawFields: Record<string, string> = {};
    const fieldRe =
      /(\w+)\s*=\s*\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}/g;
    for (const m of part.matchAll(fieldRe)) {
      rawFields[m[1].toLowerCase()] = m[2];
    }
    // Unquoted macro values (e.g. month = may)
    for (const m of part.matchAll(/(\w+)\s*=\s*([a-zA-Z]+),/g)) {
      const key = m[1].toLowerCase();
      if (!(key in rawFields)) rawFields[key] = m[2].toLowerCase();
    }

    const fields: Record<string, string> = Object.fromEntries(
      Object.entries(rawFields).map(([k, v]) => [k, decode(v)])
    );

    // Extract URL from raw howpublished before decode can mangle \url{...}
    const { venue: howVenue, url: howUrl } = rawFields.howpublished
      ? extractUrl(rawFields.howpublished)
      : {};

    const rawMonth = fields.month;
    const month = rawMonth
      ? (MONTH_ABBR[rawMonth.slice(0, 3).toLowerCase()] ?? rawMonth)
      : undefined;

    const eprint = fields.eprint;
    const isArxiv =
      (fields.archiveprefix ?? "").toLowerCase().startsWith("arxiv") && !!eprint;

    entries.push({
      key: header[2],
      type: header[1].toLowerCase(),
      author: fields.author ? formatAuthors(fields.author) : undefined,
      title: fields.title ?? header[2],
      year: fields.year,
      month,
      venue:
        fields.journal ?? fields.booktitle ?? howVenue ??
        (isArxiv ? `arXiv:${eprint}` : undefined),
      url:
        fields.url ?? howUrl ??
        (isArxiv ? `https://arxiv.org/abs/${eprint}` : undefined),
      doi: fields.doi,
      note: fields.note,
    });
  }

  return entries;
}
