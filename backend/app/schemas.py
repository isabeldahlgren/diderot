import uuid
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, EmailStr


class AuthorIn(BaseModel):
    model_config = {"from_attributes": True, "protected_namespaces": ()}

    name: str
    author_type: str  # "human" | "ai"
    model_family: Optional[str] = None
    model_version: Optional[str] = None
    provider: Optional[str] = None
    contribution: Optional[str] = None


class AuthorOut(AuthorIn):
    id: uuid.UUID
    paper_id: uuid.UUID


class CertificateIn(BaseModel):
    certificate_type: str = "ai_usage"  # "ai_usage" | "peer_review" | "code_availability" | "data_availability"
    issuer_type: str  # "self" | "human_reviewer"
    payload: dict[str, Any]


class CertificateOut(BaseModel):
    id: uuid.UUID
    paper_id: uuid.UUID
    certificate_type: str
    issuer_name: str
    issuer_url: str
    issuer_type: str
    issuer_user_id: Optional[uuid.UUID] = None
    issuer_display_name: Optional[str] = None
    issued_at: datetime
    payload: dict[str, Any]
    version: int = 1

    model_config = {"from_attributes": True}


class PaperOut(BaseModel):
    id: uuid.UUID
    title: str
    abstract: str
    subject_area: str
    created_at: datetime
    version: int
    parent_id: Optional[uuid.UUID]
    pdf_filename: Optional[str]
    authors: list[AuthorOut]
    certificates: list[CertificateOut]

    model_config = {"from_attributes": True}


class PaperListItem(BaseModel):
    id: uuid.UUID
    title: str
    abstract: str
    subject_area: str
    created_at: datetime
    version: int
    authors: list[AuthorOut]
    certificate_count: int

    model_config = {"from_attributes": True}


class UserRegister(BaseModel):
    email: str
    name: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut
