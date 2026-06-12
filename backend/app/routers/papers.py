import json
import os
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Paper, Author, User
from app.schemas import PaperOut, PaperListItem
from app.auth import get_current_user

router = APIRouter(prefix="/api/v1/papers", tags=["papers"])

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("", response_model=PaperOut)
async def create_paper(
    title: str = Form(...),
    abstract: str = Form(...),
    subject_area: str = Form(...),
    authors: str = Form(...),  # JSON string
    pdf: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if pdf.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="PDF file required")

    try:
        authors_data = json.loads(authors)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="authors must be valid JSON")

    filename = f"{uuid.uuid4()}.pdf"
    path = UPLOAD_DIR / filename
    content = await pdf.read()
    path.write_bytes(content)

    paper = Paper(title=title, abstract=abstract, subject_area=subject_area, pdf_filename=filename, submitter_user_id=current_user.id)
    db.add(paper)
    db.flush()

    for a in authors_data:
        author = Author(
            paper_id=paper.id,
            name=a["name"],
            author_type=a["author_type"],
            model_family=a.get("model_family"),
            model_version=a.get("model_version"),
            provider=a.get("provider"),
            contribution=a.get("contribution"),
        )
        db.add(author)

    db.commit()
    db.refresh(paper)
    return paper


@router.get("", response_model=list[PaperListItem])
def list_papers(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    papers = db.query(Paper).order_by(Paper.created_at.desc()).offset(skip).limit(limit).all()
    result = []
    for p in papers:
        result.append(PaperListItem(
            id=p.id,
            title=p.title,
            abstract=p.abstract,
            subject_area=p.subject_area,
            created_at=p.created_at,
            version=p.version,
            authors=p.authors,
            certificate_count=len(p.certificates),
        ))
    return result


@router.get("/{paper_id}", response_model=PaperOut)
def get_paper(paper_id: uuid.UUID, db: Session = Depends(get_db)):
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    return paper
