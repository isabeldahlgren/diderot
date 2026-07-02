import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Agent, Author, Paper, User
from app.schemas import AgentIn, AgentPublic, PaperListItem
from app.auth import get_current_user
from app.routers.papers import _to_list_item, _submitter_names, get_or_create_agent

router = APIRouter(prefix="/api/v1/agents", tags=["agents"])


def _paper_counts_for_agents(agent_ids: list[uuid.UUID], db: Session) -> dict[uuid.UUID, int]:
    if not agent_ids:
        return {}
    rows = (
        db.query(Author.agent_id, func.count(func.distinct(Author.paper_id)))
        .filter(Author.agent_id.in_(agent_ids))
        .group_by(Author.agent_id)
        .all()
    )
    return {agent_id: count for agent_id, count in rows}


def _to_agent_public(agent: Agent, paper_count: int) -> AgentPublic:
    return AgentPublic(
        id=agent.id,
        name=agent.name,
        description_url=agent.description_url,
        created_at=agent.created_at,
        paper_count=paper_count,
    )


@router.get("", response_model=list[AgentPublic])
def list_agents(db: Session = Depends(get_db)):
    all_agents = db.query(Agent).all()
    counts = _paper_counts_for_agents([a.id for a in all_agents], db)
    all_agents.sort(key=lambda a: (-counts.get(a.id, 0), a.name.lower()))
    return [_to_agent_public(a, counts.get(a.id, 0)) for a in all_agents]


@router.post("", response_model=AgentPublic)
def register_agent(body: AgentIn, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not body.name.strip() or not body.description_url.strip():
        raise HTTPException(status_code=400, detail="name and description_url are required")
    agent = get_or_create_agent(db, body.name, body.description_url)
    db.commit()
    db.refresh(agent)
    count = _paper_counts_for_agents([agent.id], db).get(agent.id, 0)
    return _to_agent_public(agent, count)


@router.get("/search", response_model=list[AgentPublic])
def search_agents(q: str = Query(...), db: Session = Depends(get_db)):
    query = q.strip()
    if not query:
        return []
    agents = (
        db.query(Agent)
        .filter(Agent.name.ilike(f"%{query}%"))
        .order_by(Agent.name)
        .limit(10)
        .all()
    )
    counts = _paper_counts_for_agents([a.id for a in agents], db)
    return [_to_agent_public(a, counts.get(a.id, 0)) for a in agents]


@router.get("/{agent_id}", response_model=AgentPublic)
def get_agent(agent_id: uuid.UUID, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    count = _paper_counts_for_agents([agent.id], db).get(agent.id, 0)
    return _to_agent_public(agent, count)


@router.get("/{agent_id}/papers", response_model=list[PaperListItem])
def get_agent_papers(agent_id: uuid.UUID, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    papers = (
        db.query(Paper)
        .join(Author)
        .filter(Author.agent_id == agent_id)
        .order_by(Paper.created_at.desc())
        .distinct()
        .all()
    )
    names = _submitter_names(papers, db)
    return [_to_list_item(p, names.get(p.submitter_user_id)) for p in papers]
