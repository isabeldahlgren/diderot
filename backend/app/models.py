import uuid
from datetime import datetime
from sqlalchemy import String, Text, Integer, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, mapped_column, Mapped
from typing import Optional
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    orcid_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    certificates: Mapped[list["Certificate"]] = relationship("Certificate", back_populates="issuer_user")


class Paper(Base):
    __tablename__ = "papers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String, nullable=False)
    abstract: Mapped[str] = mapped_column(Text, nullable=False)
    subject_area: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    version: Mapped[int] = mapped_column(Integer, default=1)
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("papers.id", ondelete="SET NULL"), nullable=True)
    root_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("papers.id", ondelete="SET NULL"), nullable=True)
    pdf_filename: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    submitter_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    authors: Mapped[list["Author"]] = relationship("Author", back_populates="paper", cascade="all, delete-orphan")
    certificates: Mapped[list["Certificate"]] = relationship("Certificate", back_populates="paper", cascade="all, delete-orphan")


class Author(Base):
    __tablename__ = "authors"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    paper_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("papers.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    author_type: Mapped[str] = mapped_column(String, nullable=False)  # "human" | "ai"
    model_family: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    model_version: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    provider: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    contribution: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    paper: Mapped["Paper"] = relationship("Paper", back_populates="authors")


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    paper_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("papers.id", ondelete="CASCADE"), nullable=False)
    author_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    author_name: Mapped[str] = mapped_column(String, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Certificate(Base):
    __tablename__ = "certificates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    paper_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("papers.id", ondelete="CASCADE"), nullable=False)
    certificate_type: Mapped[str] = mapped_column(String, nullable=False, default="ai-usage-cards")
    issuer_name: Mapped[str] = mapped_column(String, nullable=False, default="AI Usage Cards")
    issuer_url: Mapped[str] = mapped_column(String, nullable=False, default="https://ai-cards.org")
    issuer_type: Mapped[str] = mapped_column(String, nullable=False)
    issuer_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    issuer_display_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    issued_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")

    paper: Mapped["Paper"] = relationship("Paper", back_populates="certificates")
    issuer_user: Mapped[Optional["User"]] = relationship("User", back_populates="certificates")
