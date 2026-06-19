from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models import Paper, Author
from app.schemas import PaperListItem
from app.routers.papers import _to_list_item, _submitter_names

router = APIRouter(prefix="/api/v1/models", tags=["models"])


@router.get("/{model_id:path}", response_model=list[PaperListItem])
def get_model_papers(model_id: str, db: Session = Depends(get_db)):
    papers = (
        db.query(Paper)
        .join(Author)
        .filter(
            Author.author_type == "ai",
            or_(Author.model_version == model_id, Author.name == model_id),
        )
        .order_by(Paper.created_at.desc())
        .distinct()
        .all()
    )
    names = _submitter_names(papers, db)
    return [_to_list_item(p, names.get(p.submitter_user_id)) for p in papers]
