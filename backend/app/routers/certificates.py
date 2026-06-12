import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Paper, Certificate, User
from app.schemas import CertificateIn, CertificateOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/v1/papers", tags=["certificates"])

VALID_ISSUER_TYPES = {"self", "human_reviewer"}

CERT_TYPE_META: dict[str, dict[str, str]] = {
    "ai_usage": {
        "issuer_name": "AI Authorship Disclosure",
        "issuer_url": "https://ai-cards.org",
    },
    "peer_review": {
        "issuer_name": "Peer Review",
        "issuer_url": "",
    },
    "code_availability": {
        "issuer_name": "Code Availability",
        "issuer_url": "",
    },
    "data_availability": {
        "issuer_name": "Data Availability",
        "issuer_url": "",
    },
}


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

    if cert_in.certificate_type not in CERT_TYPE_META:
        raise HTTPException(
            status_code=400,
            detail=f"certificate_type must be one of {set(CERT_TYPE_META.keys())}",
        )

    if cert_in.issuer_type == "self" and paper.submitter_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the paper's submitter can add a self-issued certificate")

    max_version = (
        db.query(func.max(Certificate.version))
        .filter(Certificate.paper_id == paper_id, Certificate.certificate_type == cert_in.certificate_type)
        .scalar()
    ) or 0

    meta = CERT_TYPE_META[cert_in.certificate_type]
    cert = Certificate(
        paper_id=paper_id,
        certificate_type=cert_in.certificate_type,
        issuer_name=meta["issuer_name"],
        issuer_url=meta["issuer_url"],
        issuer_type=cert_in.issuer_type,
        issuer_user_id=current_user.id,
        issuer_display_name=current_user.name,
        payload=cert_in.payload,
        version=max_version + 1,
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
