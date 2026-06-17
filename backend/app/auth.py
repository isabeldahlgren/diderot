import os
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import urlencode
import httpx
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

ORCID_CLIENT_ID = os.getenv("ORCID_CLIENT_ID", "")
ORCID_CLIENT_SECRET = os.getenv("ORCID_CLIENT_SECRET", "")
ORCID_REDIRECT_URI = os.getenv("ORCID_REDIRECT_URI", "http://localhost:8000/api/v1/auth/orcid/callback")
# ORCID provides a free sandbox (sandbox.orcid.org) with the same API shape as production,
# so local/dev environments can exercise the real OAuth flow without production credentials.
ORCID_ENV = os.getenv("ORCID_ENV", "sandbox")
ORCID_BASE_URL = "https://orcid.org" if ORCID_ENV == "production" else "https://sandbox.orcid.org"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/orcid/login", auto_error=True)


def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": user_id, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def get_orcid_authorize_url() -> str:
    params = {
        "client_id": ORCID_CLIENT_ID,
        "response_type": "code",
        "scope": "/authenticate",
        "redirect_uri": ORCID_REDIRECT_URI,
    }
    return f"{ORCID_BASE_URL}/oauth/authorize?{urlencode(params)}"


def exchange_orcid_code(code: str) -> dict:
    """Exchanges an authorization code for the caller's ORCID iD and name.

    ORCID's token endpoint returns the iD and name directly alongside the
    access token, so no separate profile API call is needed for sign-in.
    """
    response = httpx.post(
        f"{ORCID_BASE_URL}/oauth/token",
        headers={"Accept": "application/json"},
        data={
            "client_id": ORCID_CLIENT_ID,
            "client_secret": ORCID_CLIENT_SECRET,
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": ORCID_REDIRECT_URI,
        },
    )
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="ORCID authentication failed")
    return response.json()


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise credentials_exc
    except JWTError:
        raise credentials_exc
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exc
    return user
