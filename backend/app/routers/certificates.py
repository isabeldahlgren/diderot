import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Paper, Certificate, User
from app.schemas import CertificateIn, CertificateOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/v1/papers", tags=["certificates"])

VALID_ISSUER_TYPES = {"self", "human_reviewer"}


@router.post("/{paper_id}/certificates", response_model=CertificateOut)
def add_certificate(
    paper_id: uuid.UUID,
    cert_in: CertificateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    if cert_in.issuer_type not in VALID_ISSUER_TYPES:
        raise HTTPException(status_code=400, detail=f"issuer_type must be one of {VALID_ISSUER_TYPES}")

    cert = Certificate(
        paper_id=paper_id,
        issuer_type=cert_in.issuer_type,
        issuer_user_id=current_user.id,
        issuer_display_name=current_user.name,
        payload=cert_in.payload,
    )
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return cert


@router.get("/{paper_id}/certificates", response_model=list[CertificateOut])
def list_certificates(paper_id: uuid.UUID, db: Session = Depends(get_db)):
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    return paper.certificates
