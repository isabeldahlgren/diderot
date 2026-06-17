import os
from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import UserOut
from app.auth import get_orcid_authorize_url, exchange_orcid_code, create_access_token, get_current_user

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.get("/orcid/login")
def orcid_login():
    return RedirectResponse(get_orcid_authorize_url())


@router.get("/orcid/callback")
def orcid_callback(code: str, db: Session = Depends(get_db)):
    data = exchange_orcid_code(code)
    orcid_id = data["orcid"]
    name = data.get("name") or orcid_id

    user = db.query(User).filter(User.orcid_id == orcid_id).first()
    if not user:
        user = User(orcid_id=orcid_id, name=name)
        db.add(user)
    elif name and name != orcid_id:
        user.name = name
    db.commit()
    db.refresh(user)

    token = create_access_token(str(user.id))
    return RedirectResponse(f"{FRONTEND_URL}/auth/callback?token={token}")


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
