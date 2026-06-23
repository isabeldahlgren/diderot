import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Paper, Comment, User
from app.schemas import CommentIn, CommentEdit, CommentOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/v1/papers", tags=["comments"])


@router.get("/{paper_id}/comments", response_model=list[CommentOut])
def list_comments(paper_id: uuid.UUID, db: Session = Depends(get_db)):
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    return (
        db.query(Comment)
        .filter(Comment.paper_id == paper_id)
        .order_by(Comment.created_at)
        .all()
    )


@router.post("/{paper_id}/comments", response_model=CommentOut)
def add_comment(
    paper_id: uuid.UUID,
    comment_in: CommentIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    if not comment_in.body.strip():
        raise HTTPException(status_code=400, detail="Comment body cannot be empty")
    comment = Comment(
        paper_id=paper_id,
        author_user_id=current_user.id,
        author_name=current_user.name,
        body=comment_in.body.strip(),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.patch("/{paper_id}/comments/{comment_id}", response_model=CommentOut)
def edit_comment(
    paper_id: uuid.UUID,
    comment_id: uuid.UUID,
    edit: CommentEdit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.paper_id == paper_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.author_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")
    new_body = edit.body.strip()
    if not new_body:
        raise HTTPException(status_code=400, detail="Comment body cannot be empty")
    history = list(comment.edit_history or [])
    history.append({"body": comment.body, "edited_at": comment.edited_at.isoformat() if comment.edited_at else comment.created_at.isoformat()})
    comment.edit_history = history
    comment.body = new_body
    comment.edited_at = datetime.utcnow()
    db.commit()
    db.refresh(comment)
    return comment
