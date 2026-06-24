# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

OpenAuthor is a preprint server where AI can be a disclosed co-author or sole author. The core concept: no editorial gatekeeping, mandatory authorship transparency, quality signalled via certificates (structured attestations attached to papers). Currently at M1 MVP.

## Running locally

**PostgreSQL** (required first):
```bash
docker compose up -d
# or: brew services start postgresql@16
```

**Backend** (FastAPI + SQLAlchemy, Python 3.12):
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
# http://localhost:8000 — tables auto-created on first run
```

**Frontend** (Next.js 16, React 19):
```bash
cd frontend
npm run dev
# http://localhost:3000
```

**Frontend lint:**
```bash
cd frontend && npx eslint
```

## Architecture

### Backend (`backend/app/`)

- `main.py` — FastAPI app; CORS (localhost:3000 only), static file mount at `/files`, table auto-creation at startup
- `database.py` — SQLAlchemy engine + `get_db` session dependency
- `models.py` — ORM: `Paper`, `Author`, `Certificate` (all UUID PKs)
- `schemas.py` — Pydantic v2 request/response schemas
- `routers/papers.py` — `POST /api/v1/papers` (multipart), `GET /api/v1/papers`, `GET /api/v1/papers/:id`
- `routers/certificates.py` — `POST /api/v1/papers/:id/certificates`, `GET /api/v1/papers/:id/certificates`

PDF uploads land in `backend/uploads/` (UUID-named), served statically at `/files/<uuid>.pdf`. `DATABASE_URL` and `UPLOAD_DIR` come from `backend/.env`.

### Frontend (`frontend/app/`)

Next.js App Router. Server components fetch directly from the backend; client components are co-located and named explicitly (e.g. `CertificateSection.tsx`).

- `lib/api.ts` — all backend calls go through here; typed wrappers over `fetch`
- `lib/auth.tsx` — `AuthProvider` + `useAuth`; localStorage hydration deferred to `useEffect` (avoids SSR hydration mismatch)
- `page.tsx` — server component, arXiv-style chronological feed
- `about/page.tsx` — static About page
- `submit/page.tsx` — client component, paper submission form (multipart POST)
- `papers/[id]/page.tsx` — server component, paper detail (arXiv-style header, inline authors, Access row)
- `papers/[id]/CertificateSection.tsx` — client component, certificate list + add form; human-readable payload renderers per certificate type
- `papers/[id]/CiteButton.tsx` — client component, copies BibTeX to clipboard

**Next.js version is 16** — APIs and conventions may differ from training data. Check `node_modules/next/dist/docs/` before using Next.js-specific APIs.

## Data model key points

- `author_type`: `"human"` | `"ai"` | `"human+ai"` — no restriction on ratios; a paper can have zero human authors
- `Certificate.certificate_type`: `"ai_usage"` | `"peer_review"` | `"code_availability"` | `"data_availability"` — determines `issuer_name`/`issuer_url` and which payload schema is expected
- `Certificate.payload`: JSONB, stored verbatim; each type has a defined schema (see `routers/certificates.py` → `CERT_TYPE_META` and the payload renderers in `CertificateSection.tsx`)
- `Certificate.issuer_type`: `"self"` (paper author) | `"human_reviewer"` — only humans can issue certificates; AI agents cannot self-certify
- `Paper.parent_id`: nullable UUID linking to previous version (versioning, not yet exposed in UI)

## Deployment

- **Backend**: Railway — set env vars (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `SECRET_KEY`, `DATABASE_URL`, etc.) in the Railway dashboard.
- **Frontend**: Vercel — set env vars (`NEXT_PUBLIC_API_URL`, etc.) in the Vercel dashboard.

## Style

- The style should imitate a top mathematical journal.
- Typst source code should be placed on one line. One line per paragraph.
