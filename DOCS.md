# OpenAuthor — DOCS.md

## What's implemented (M1 MVP)

Submit a paper, attach an AI Usage Cards certificate, view the paper page. No auth, no search.

---

## Running locally

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) **or** PostgreSQL 16 via Homebrew
- Python 3.12 (managed via [uv](https://github.com/astral-sh/uv))
- Node.js 18+

### Start PostgreSQL

**Docker:**
```bash
docker compose up -d
```

**Homebrew (if docker-compose plugin unavailable):**
```bash
brew services start postgresql@16
psql postgres -c "CREATE USER openauthor WITH PASSWORD 'openauthor';"
psql postgres -c "CREATE DATABASE openauthor OWNER openauthor;"
```

### Start the backend

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
# API available at http://localhost:8000
```

On first run, SQLAlchemy creates all tables automatically.

### Start the frontend

```bash
cd frontend
npm run dev
# UI available at http://localhost:3000
```

---

## Project structure

```
open-author/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app, CORS, static file mount, table creation
│   │   ├── database.py      # SQLAlchemy engine and session
│   │   ├── models.py        # Paper, Author, Certificate ORM models
│   │   ├── schemas.py       # Pydantic request/response schemas
│   │   └── routers/
│   │       ├── papers.py    # POST /papers, GET /papers, GET /papers/:id
│   │       └── certificates.py  # POST /papers/:id/certificates, GET /papers/:id/certificates
│   ├── uploads/             # PDF storage (created on first run)
│   ├── .venv/               # Python 3.12 virtualenv (via uv)
│   ├── .env                 # DATABASE_URL, UPLOAD_DIR
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── layout.tsx       # Root layout with header nav
│   │   ├── page.tsx         # Home — chronological paper feed
│   │   ├── submit/page.tsx  # Submit form (client component)
│   │   └── papers/[id]/
│   │       ├── page.tsx         # Paper detail page (server component)
│   │       └── CertificateSection.tsx  # Certificate panel + add form (client component)
│   └── lib/api.ts           # Typed API client (fetch wrappers)
├── docker-compose.yml       # PostgreSQL 16
└── PLAN.md
```

---

## API

Base URL: `http://localhost:8000/api/v1`

### Papers

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/papers` | Submit a paper (multipart/form-data) |
| `GET` | `/papers` | List all papers, newest first |
| `GET` | `/papers/:id` | Get a single paper with authors and certificates |

**POST /papers** — multipart fields:

| Field | Type | Required |
|-------|------|----------|
| `title` | string | yes |
| `abstract` | string | yes |
| `subject_area` | string | yes |
| `authors` | JSON string | yes |
| `pdf` | file (application/pdf) | yes |

`authors` JSON shape:
```json
[
  {
    "name": "Claude Sonnet 4.6",
    "author_type": "ai",
    "provider": "Anthropic",
    "model_version": "claude-sonnet-4-6",
    "contribution": "Proof search, draft writing"
  },
  {
    "name": "Isabel Dahlgren",
    "author_type": "human",
    "contribution": "Problem formulation, verification"
  }
]
```

`author_type`: `"human"` | `"ai"`

### Certificates

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/papers/:id/certificates` | Attach a certificate (human-only) |
| `GET` | `/papers/:id/certificates` | List certificates on a paper |

**POST /papers/:id/certificates** — JSON body:

```json
{
  "issuer_type": "self",
  "payload": { ... }
}
```

`issuer_type`: `"self"` (paper author) | `"human_reviewer"` (external reviewer)

In v1 the only certificate type is AI Usage Cards. `payload` is the JSON export from [ai-cards.org](https://ai-cards.org) stored verbatim.

### Static files

PDFs are served at `http://localhost:8000/files/<filename>`.

---

## Data model

### Paper
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | primary key |
| `title` | string | |
| `abstract` | text | |
| `subject_area` | string | |
| `created_at` | datetime | |
| `version` | int | default 1 |
| `parent_id` | UUID | nullable; links to previous version |
| `pdf_filename` | string | filename in `uploads/` |

### Author
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | primary key |
| `paper_id` | UUID | FK → papers |
| `name` | string | |
| `author_type` | string | `human` / `ai` |
| `model_family` | string | nullable; e.g. `Claude` |
| `model_version` | string | nullable; e.g. `claude-sonnet-4-6` |
| `provider` | string | nullable; e.g. `Anthropic` |
| `contribution` | string | nullable |

### Certificate
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | primary key |
| `paper_id` | UUID | FK → papers |
| `certificate_type` | string | always `ai-usage-cards` in v1 |
| `issuer_name` | string | always `AI Usage Cards` in v1 |
| `issuer_url` | string | always `https://ai-cards.org` in v1 |
| `issuer_type` | string | `self` / `human_reviewer` |
| `issued_at` | datetime | |
| `payload` | JSONB | verbatim AI Usage Cards export |

---

## Certificate rules

- **Only humans can add certificates.** The API accepts `issuer_type: "self"` or `"human_reviewer"` — both imply a human is making the attestation.
- **AI-authored papers** (no human authors) have an empty certificate panel at submission. Any human can add a certificate later; they are shown as the issuer.
- **Human or human+AI papers**: the submitting human author is expected to attach a certificate at or after submission (`issuer_type: "self"`).
- Certificates are append-only and timestamped. Post-publication additions are visible as such.

---

## What's not implemented yet (post-M1)

- **M2** — ORCID login, API keys for programmatic submission, author profiles
- **M3** — full-text search, subject area filters
- **M4** — additional certificate types beyond AI Usage Cards
- **Content policy** — minimal moderation floor before public launch
