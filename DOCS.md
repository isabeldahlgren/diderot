# OpenAuthor — DOCS.md

OpenAuthor is a preprint server where AI can be a disclosed co-author or sole author. Quality is signalled via certificates (structured attestations attached to papers). No editorial gatekeeping; authorship must be transparent.

---

## Running locally

**PostgreSQL** (required first):
```bash
docker compose up -d
```

**Backend** (FastAPI, Python 3.12):
```bash
cd backend && source .venv/bin/activate
uvicorn app.main:app --reload   # http://localhost:8000
```

**Frontend** (Next.js 16):
```bash
cd frontend && npm run dev      # http://localhost:3000
```

**Lint:**
```bash
cd frontend && npx eslint
```

---

## API

Base URL: `http://localhost:8000/api/v1` (prod: Railway URL via `NEXT_PUBLIC_API_URL`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/register` | — | Create account |
| `POST` | `/auth/login` | — | Get JWT token |
| `GET` | `/users/:id` | — | Public profile |
| `GET` | `/users/:id/papers` | — | Papers submitted by user |
| `GET` | `/papers` | — | List all papers, newest first |
| `POST` | `/papers` | required | Submit a paper (multipart) |
| `GET` | `/papers/:id` | — | Paper detail with authors + certificates |
| `GET` | `/papers/:id/versions` | — | Version history |
| `GET` | `/papers/:id/certificates` | — | List certificates |
| `POST` | `/papers/:id/certificates` | required | Attach a certificate |

**POST /papers** multipart fields: `title`, `abstract`, `subject_area`, `authors` (JSON string), `pdf` (file), optional `parent_id`.

`authors` shape:
```json
[
  { "name": "Claude Sonnet 4.6", "author_type": "ai", "provider": "Anthropic", "model_version": "claude-sonnet-4-6", "contribution": "Proof search" },
  { "name": "Isabel Dahlgren", "author_type": "human", "contribution": "Problem formulation" }
]
```

**POST /papers/:id/certificates** JSON body: `{ "certificate_type": "...", "issuer_type": "self"|"human_reviewer", "payload": { ... } }`

Certificate types: `ai_usage` · `proof_verification` · `formal_verification` · `citation_check`

PDFs served at `/files/<filename>`.

---

## Data model

**Paper** — `id`, `title`, `abstract`, `subject_area`, `created_at`, `version`, `parent_id` (nullable, previous version), `root_id` (nullable, first version), `pdf_filename`, `submitter_user_id`

**Author** — `id`, `paper_id`, `name`, `author_type` (`human`/`ai`), `model_family`, `model_version`, `provider`, `contribution`, `user_id` (nullable, links to registered user)

**Certificate** — `id`, `paper_id`, `certificate_type`, `issuer_name`, `issuer_url`, `issuer_type`, `issuer_user_id`, `issuer_display_name`, `issued_at`, `payload` (JSONB), `version`

**User** — `id`, `email`, `name`, `password_hash`, `created_at`

---

## Certificate rules

Only humans can issue certificates (`issuer_type: "self"` = paper author; `"human_reviewer"` = external). Certificates are append-only; multiple versions of the same type are tracked with `version`.

---

## About page references

References on the About page are managed via `frontend/app/about/references.bib` (standard BibTeX). Citation numbers are assigned by order of appearance in that file.

**To add a reference**, append an entry:
```bibtex
@misc{mykey,
  author = {Last, First},
  title  = {Title of the Work},
  year   = {2025},
  note   = {Talk, May 2, 2025},   % use for venue/type info
  url    = {https://example.com},
}
```

Use `@article` for journal papers (`journal = {...}` renders as the venue), `@misc` for everything else. Supported fields: `author`, `title`, `year`, `url`, `note`, `journal`, `booktitle`, `howpublished`.

**To cite inline** in `page.tsx`, use `{c("mykey")}` — this renders a linked `[N]` that anchors to the references list. The `c` helper is defined at the top of `AboutPage` and looks up by cite key.

---

## Resetting data for testing

Delete all papers (cascades to authors + certificates):
```sql
TRUNCATE papers CASCADE;
```

Wipe everything:
```sql
TRUNCATE users, papers, authors, certificates CASCADE;
```

**Do not** use `DROP SCHEMA public CASCADE` — it strips permissions and causes a 500 on next startup. If you do, recover with:
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;  -- use your DB username
```
Then restart the Railway backend so `create_all` reruns.
