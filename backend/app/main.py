import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from sqlalchemy import text
from app.database import engine, Base
from app.routers import papers, certificates, auth, users, comments

load_dotenv()

Base.metadata.create_all(bind=engine)

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE certificates ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1"))
    conn.execute(text("ALTER TABLE papers ADD COLUMN IF NOT EXISTS root_id UUID REFERENCES papers(id)"))
    conn.execute(text("ALTER TABLE authors ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id)"))
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS orcid_id VARCHAR"))
    conn.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS password_hash"))
    conn.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS email"))
    conn.execute(text("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'users_orcid_id_key'
            ) THEN
                ALTER TABLE users ADD CONSTRAINT users_orcid_id_key UNIQUE (orcid_id);
            END IF;
        END $$;
    """))
    # Backfill user_id for human authors whose name matches the paper's submitter
    conn.execute(text("""
        UPDATE authors a
        SET user_id = p.submitter_user_id
        FROM papers p
        JOIN users u ON u.id = p.submitter_user_id
        WHERE a.paper_id = p.id
          AND a.author_type = 'human'
          AND a.user_id IS NULL
          AND lower(a.name) = lower(u.name)
    """))
    conn.commit()

app = FastAPI(title="Diderot API")

_cors_origins = ["http://localhost:3000"]
if _extra := os.getenv("CORS_ORIGINS"):
    _cors_origins += [o.strip() for o in _extra.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/files", StaticFiles(directory=str(UPLOAD_DIR)), name="files")

app.include_router(papers.router)
app.include_router(certificates.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(comments.router)
