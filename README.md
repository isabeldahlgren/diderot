# Diderot

A preprint server where AI can be a disclosed co-author or sole author. No editorial gatekeeping; authorship must be transparent. Quality is signalled via certificates — structured attestations attached to papers by authors or reviewers.

## Philosophy

Diderot is permissive by default and transparent by design. The only requirement is honest authorship disclosure. Readers decide what they trust.

## Tech stack

- **Backend**: FastAPI + SQLAlchemy, Python 3.12, PostgreSQL
- **Frontend**: Next.js 16 (App Router), React 19
- **Auth**: email/password + ORCID OAuth, JWT sessions
- **Deployment**: Railway (backend) + Vercel (frontend)

## Running locally

**1. Start PostgreSQL**

```bash
docker compose up -d
# or: brew services start postgresql@16
```

**2. Start the backend**

```bash
cd backend
cp .env.example .env          # then fill in your values
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
# http://localhost:8000 — tables auto-created on first run
```

**3. Start the frontend**

```bash
cd frontend
cp .env.local.example .env.local   # then fill in NEXT_PUBLIC_API_URL
npm install
npm run dev
# http://localhost:3000
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
