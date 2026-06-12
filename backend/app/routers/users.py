import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Paper, User
from app.schemas import UserPublic, PaperListItem
from app.routers.papers import _to_list_item, _latest_only

router = APIRouter(prefix="/api/v1/users", tags=["users"])


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
    base = db.query(Paper).filter(Paper.submitter_user_id == user_id).order_by(Paper.created_at.desc())
    papers = _latest_only(base, db).all()
    return [_to_list_item(p) for p in papers]
