import json
import os
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from app.database import get_db
from app.models import Paper, Author, User
from app.schemas import PaperOut, PaperListItem
from app.auth import get_current_user

router = APIRouter(prefix="/api/v1/papers", tags=["papers"])

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _to_list_item(p: Paper, submitter_name: str | None = None) -> PaperListItem:
    return PaperListItem(
        id=p.id,
        title=p.title,
        abstract=p.abstract,
        subject_area=p.subject_area,
        created_at=p.created_at,
        version=p.version,
        root_id=p.root_id,
        submitter_user_id=p.submitter_user_id,
        submitter_name=submitter_name,
        authors=p.authors,
        certificate_count=len(p.certificates),
    )


def _submitter_names(papers: list[Paper], db: Session) -> dict:
    ids = {p.submitter_user_id for p in papers if p.submitter_user_id}
    if not ids:
        return {}
    users = db.query(User).filter(User.id.in_(ids)).all()
    return {u.id: u.name for u in users}


def _latest_only(query, db: Session):
    superseded = db.query(Paper.parent_id).filter(Paper.parent_id.isnot(None)).subquery()
    return query.filter(~Paper.id.in_(superseded))


@router.post("", response_model=PaperOut)
async def create_paper(
    title: str = Form(...),
    abstract: str = Form(...),
    subject_area: str = Form(...),
    authors: str = Form(...),
    pdf: UploadFile = File(...),
    parent_id: Optional[str] = Form(None),
    supplementary_url: Optional[str] = Form(None),
    license: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if pdf.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="PDF file required")

    try:
        authors_data = json.loads(authors)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="authors must be valid JSON")

    paper_version = 1
    paper_parent_id = None
    paper_root_id = None

    if parent_id:
        try:
            parent_uuid = uuid.UUID(parent_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid parent_id")
        parent = db.query(Paper).filter(Paper.id == parent_uuid).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent paper not found")
        if parent.submitter_user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Only the original submitter can create a new version")
        paper_version = parent.version + 1
        paper_parent_id = parent.id
        paper_root_id = parent.root_id or parent.id

    filename = f"{uuid.uuid4()}.pdf"
    path = UPLOAD_DIR / filename
    content = await pdf.read()
    path.write_bytes(content)

    paper = Paper(
        title=title,
        abstract=abstract,
        subject_area=subject_area,
        pdf_filename=filename,
        supplementary_url=supplementary_url or None,
        license=license or None,
        submitter_user_id=current_user.id,
        version=paper_version,
        parent_id=paper_parent_id,
        root_id=paper_root_id,
    )
    db.add(paper)
    db.flush()

    user_name_lower = current_user.name.strip().lower()
    for a in authors_data:
        if a["author_type"] == "human":
            provided_uid = a.get("user_id")
            if provided_uid:
                try:
                    linked_user_id = uuid.UUID(str(provided_uid))
                    if not db.query(User).filter(User.id == linked_user_id).first():
                        linked_user_id = None
                except (ValueError, AttributeError):
                    linked_user_id = None
            elif a["name"].strip().lower() == user_name_lower:
                linked_user_id = current_user.id
            else:
                linked_user_id = None
        else:
            linked_user_id = None
        author = Author(
            paper_id=paper.id,
            name=a["name"],
            author_type=a["author_type"],
            model_family=a.get("model_family"),
            model_version=a.get("model_version"),
            provider=a.get("provider"),
            contribution=a.get("contribution"),
            user_id=linked_user_id,
        )
        db.add(author)

    db.commit()
    db.refresh(paper)
    result = PaperOut.model_validate(paper)
    return result.model_copy(update={"submitter_name": current_user.name})


@router.get("", response_model=list[PaperListItem])
def list_papers(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    base = db.query(Paper).order_by(Paper.created_at.desc())
    papers = _latest_only(base, db).offset(skip).limit(limit).all()
    names = _submitter_names(papers, db)
    return [_to_list_item(p, names.get(p.submitter_user_id)) for p in papers]


@router.get("/{paper_id}/versions", response_model=list[PaperListItem])
def get_paper_versions(paper_id: uuid.UUID, db: Session = Depends(get_db)):
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    root_id = paper.root_id or paper.id
    versions = (
        db.query(Paper)
        .filter(or_(Paper.id == root_id, Paper.root_id == root_id))
        .order_by(Paper.version)
        .all()
    )
    names = _submitter_names(versions, db)
    return [_to_list_item(p, names.get(p.submitter_user_id)) for p in versions]


@router.get("/{paper_id}", response_model=PaperOut)
def get_paper(paper_id: uuid.UUID, db: Session = Depends(get_db)):
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    submitter_name = None
    if paper.submitter_user_id:
        user = db.query(User).filter(User.id == paper.submitter_user_id).first()
        submitter_name = user.name if user else None
    result = PaperOut.model_validate(paper)
    return result.model_copy(update={"submitter_name": submitter_name})
