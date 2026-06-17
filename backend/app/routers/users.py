import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from sqlalchemy import or_
from app.models import Author, Certificate, Paper, User
from app.schemas import UserPublic, PaperListItem
from app.routers.papers import _to_list_item, _latest_only

router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.get("/lookup", response_model=UserPublic)
def lookup_user_by_orcid(orcid_id: str = Query(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.orcid_id == orcid_id.strip()).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with that ORCID iD")
    return user


@router.get("/{user_id}", response_model=UserPublic)
def get_user(user_id: uuid.UUID, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/{user_id}/papers", response_model=list[PaperListItem])
def get_user_papers(user_id: uuid.UUID, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    authored_ids = db.query(Author.paper_id).filter(Author.user_id == user_id).subquery()
    base = db.query(Paper).filter(
        or_(Paper.submitter_user_id == user_id, Paper.id.in_(authored_ids))
    ).order_by(Paper.created_at.desc())
    papers = _latest_only(base, db).all()
    return [_to_list_item(p) for p in papers]


@router.get("/{user_id}/authored", response_model=list[PaperListItem])
def get_user_authored_papers(user_id: uuid.UUID, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    authored_ids = db.query(Author.paper_id).filter(Author.user_id == user_id).subquery()
    base = db.query(Paper).filter(Paper.id.in_(authored_ids)).order_by(Paper.created_at.desc())
    papers = _latest_only(base, db).all()
    return [_to_list_item(p) for p in papers]


@router.get("/{user_id}/submitted", response_model=list[PaperListItem])
def get_user_submitted_papers(user_id: uuid.UUID, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    base = db.query(Paper).filter(Paper.submitter_user_id == user_id).order_by(Paper.created_at.desc())
    papers = _latest_only(base, db).all()
    return [_to_list_item(p) for p in papers]


@router.get("/{user_id}/reviewed", response_model=list[PaperListItem])
def get_user_reviewed_papers(user_id: uuid.UUID, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    certified_ids = (
        db.query(Certificate.paper_id)
        .filter(Certificate.issuer_user_id == user_id)
        .distinct()
        .subquery()
    )
    papers = (
        db.query(Paper)
        .filter(Paper.id.in_(certified_ids))
        .order_by(Paper.version.desc(), Paper.created_at.desc())
        .all()
    )
    seen: set[uuid.UUID] = set()
    deduped = []
    for p in papers:
        root = p.root_id or p.id
        if root not in seen:
            seen.add(root)
            deduped.append(p)
    return [_to_list_item(p) for p in deduped]


