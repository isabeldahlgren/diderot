import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, MagicToken
from app.schemas import UserOut, MagicLinkRequest
from app.auth import (
    get_orcid_authorize_url,
    exchange_orcid_code,
    create_access_token,
    create_link_state,
    get_current_user,
    get_magic_token,
    send_magic_link_email,
    SECRET_KEY,
    ALGORITHM,
    APP_URL,
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

MAGIC_LINK_EXPIRE_MINUTES = 15


@router.post("/email/request", status_code=202)
def request_magic_link(body: MagicLinkRequest, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        name = body.name.strip() if body.name else email.split("@")[0]
        user = User(email=email, name=name)
        db.add(user)
        db.commit()
        db.refresh(user)

    token_value = get_magic_token()
    expires_at = datetime.utcnow() + timedelta(minutes=MAGIC_LINK_EXPIRE_MINUTES)
    magic = MagicToken(user_id=user.id, token=token_value, expires_at=expires_at)
    db.add(magic)
    db.commit()

    verify_url = f"{APP_URL}/api/v1/auth/email/verify?token={token_value}"
    send_magic_link_email(email, verify_url)

    return {"detail": "Magic link sent"}


@router.get("/email/verify")
def verify_magic_link(token: str, db: Session = Depends(get_db)):
    magic = db.query(MagicToken).filter(MagicToken.token == token).first()
    if not magic or magic.used or magic.expires_at < datetime.utcnow():
        return RedirectResponse(f"{FRONTEND_URL}/login?error=invalid_link")

    magic.used = True
    user = db.query(User).filter(User.id == magic.user_id).first()
    if not user:
        db.commit()
        return RedirectResponse(f"{FRONTEND_URL}/login?error=invalid_link")

    if not user.email_verified:
        user.email_verified = True
    db.commit()

    jwt_token = create_access_token(str(user.id))
    return RedirectResponse(f"{FRONTEND_URL}/auth/callback?token={jwt_token}")


@router.get("/orcid/link-url")
def orcid_link_url(current_user: User = Depends(get_current_user)):
    state = create_link_state(str(current_user.id))
    return {"url": get_orcid_authorize_url(state=state)}


@router.get("/orcid/callback")
def orcid_callback(code: str, state: Optional[str] = None, db: Session = Depends(get_db)):
    if not state:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=no_state")

    try:
        payload = jwt.decode(state, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("action") != "link_orcid":
            raise ValueError("wrong action")
        user_id = payload["sub"]
    except (JWTError, ValueError, KeyError):
        return RedirectResponse(f"{FRONTEND_URL}/login?error=invalid_state")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=user_not_found")

    data = exchange_orcid_code(code)
    orcid_id = data["orcid"]

    conflict = db.query(User).filter(User.orcid_id == orcid_id, User.id != user.id).first()
    if conflict:
        return RedirectResponse(f"{FRONTEND_URL}/authors/{user_id}?error=orcid_taken")

    user.orcid_id = orcid_id
    db.commit()
    return RedirectResponse(f"{FRONTEND_URL}/authors/{user_id}?linked=1")


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
