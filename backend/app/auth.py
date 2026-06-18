import os
import uuid
import logging
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

logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

ORCID_CLIENT_ID = os.getenv("ORCID_CLIENT_ID", "")
ORCID_CLIENT_SECRET = os.getenv("ORCID_CLIENT_SECRET", "")
ORCID_REDIRECT_URI = os.getenv("ORCID_REDIRECT_URI", "http://localhost:8000/api/v1/auth/orcid/callback")
ORCID_ENV = os.getenv("ORCID_ENV", "sandbox")
ORCID_BASE_URL = "https://orcid.org" if ORCID_ENV == "production" else "https://sandbox.orcid.org"

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "noreply@diderot.example.com")
APP_URL = os.getenv("APP_URL", "http://localhost:8000")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/email/request", auto_error=True)


def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": user_id, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def create_link_state(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=10)
    return jwt.encode(
        {"sub": user_id, "action": "link_orcid", "exp": expire},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def get_orcid_authorize_url(state: Optional[str] = None) -> str:
    params = {
        "client_id": ORCID_CLIENT_ID,
        "response_type": "code",
        "scope": "/authenticate",
        "redirect_uri": ORCID_REDIRECT_URI,
    }
    if state:
        params["state"] = state
    return f"{ORCID_BASE_URL}/oauth/authorize?{urlencode(params)}"


def exchange_orcid_code(code: str) -> dict:
    """Returns the full ORCID token response, including access_token, orcid, and name."""
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


def fetch_orcid_emails(orcid_id: str, access_token: str = "") -> list[str]:
    """Fetches publicly visible email addresses from the ORCID public API."""
    pub_base = "https://pub.orcid.org" if ORCID_ENV == "production" else "https://pub.sandbox.orcid.org"
    response = httpx.get(
        f"{pub_base}/v3.0/{orcid_id}/email",
        headers={"Accept": "application/json"},
    )
    if response.status_code != 200:
        return []
    data = response.json()
    return [entry["email"].lower() for entry in data.get("email", []) if entry.get("email")]


def send_magic_link_email(to_email: str, verify_url: str) -> None:
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set — printing magic link to stdout")
        print(f"\n[DEV] Magic link for {to_email}:\n  {verify_url}\n")
        return

    response = httpx.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
        json={
            "from": RESEND_FROM_EMAIL,
            "to": to_email,
            "subject": "Sign in to Diderot",
            "html": (
                f"<p>Click the link below to sign in to Diderot. "
                f"It expires in 15 minutes.</p>"
                f'<p><a href="{verify_url}">{verify_url}</a></p>'
                f"<p>If you did not request this, you can ignore this email.</p>"
            ),
        },
    )
    if response.status_code not in (200, 201):
        logger.error("Resend API error: %s %s", response.status_code, response.text)
        raise HTTPException(status_code=500, detail="Failed to send email")


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


def get_magic_token() -> str:
    return str(uuid.uuid4())
