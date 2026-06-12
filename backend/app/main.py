import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from sqlalchemy import text
from app.database import engine, Base
from app.routers import papers, certificates, auth, users

load_dotenv()

Base.metadata.create_all(bind=engine)

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE certificates ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1"))
    conn.execute(text("ALTER TABLE papers ADD COLUMN IF NOT EXISTS root_id UUID REFERENCES papers(id)"))
    conn.execute(text("ALTER TABLE authors ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id)"))
    conn.commit()

app = FastAPI(title="OpenAuthor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
