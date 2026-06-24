# Contributing to Diderot

## Setup

Follow the steps in [README.md](README.md) to get a local instance running. You will need:

- Python 3.12+
- Node.js 20+
- PostgreSQL 16 (via Docker or Homebrew)

For ORCID login, register a free sandbox app at https://sandbox.orcid.org and set the credentials in `backend/.env`.

## Development workflow

1. Fork the repository and create a branch from `main`.
2. Make your changes. Keep commits focused — one logical change per commit.
3. Run the frontend linter before opening a PR:
   ```bash
   cd frontend && npx eslint
   ```
4. Open a pull request against `main`. Describe what changed and why.

## Project structure

```
backend/app/
  main.py          — FastAPI app, CORS, startup
  models.py        — SQLAlchemy ORM (Paper, Author, Certificate, User)
  schemas.py       — Pydantic request/response schemas
  auth.py          — JWT + ORCID OAuth helpers
  routers/         — one file per resource (papers, certificates, auth, …)

frontend/app/
  lib/api.ts       — all backend calls (typed fetch wrappers)
  lib/auth.tsx     — AuthProvider + useAuth hook
  page.tsx         — feed (server component)
  submit/          — paper submission form
  papers/[id]/     — paper detail page + CertificateSection, CiteButton
```

See [DOCS.md](DOCS.md) for the full API reference and [PLAN.md](PLAN.md) for the certificate type definitions and roadmap.

## Adding a certificate type

1. Add the type to `CERT_TYPE_META` in `backend/app/routers/certificates.py`.
2. Add a payload renderer in `frontend/app/papers/[id]/CertificateSection.tsx`.
3. Update the schema description in `PLAN.md` (§3).

## Code style

- Backend: no formatter enforced; follow the style of surrounding code.
- Frontend: ESLint is configured; run `npx eslint` and fix all errors before opening a PR.
- No unnecessary comments — name things well instead.
