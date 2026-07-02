<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Frontend conventions

- Site name, description, canonical URL, and community links come from `lib/site.ts` — never hardcode `projectdiderot.com`, the Zulip invite, or the GitHub URL in components.
- The root layout sets a title template (`%s — Diderot`); pages export short titles (e.g. `"About"`, or the paper title), not `"... — Diderot"`.
- Public SEO surfaces exist beyond pages: `app/feed.xml/route.ts` (RSS), `app/sitemap.ts`, `app/robots.ts`, and `generateMetadata` on `papers/[id]` (Google Scholar `citation_*` tags + JSON-LD). When paper fields change, keep these in sync with the page rendering.
- Anonymity: when `is_anonymous` is set, never expose human author names in any output — rendered pages, metadata, RSS, JSON-LD, or search. Show AI authors plus a human-author count (see `publicAuthorNames` in `papers/[id]/page.tsx`).
