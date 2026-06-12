# OpenAuthor — PLAN.md

> A preprint server where AI can be a disclosed co-author or sole author.
> Epistemic quality is not enforced — it is *signalled*, voluntarily, via certificates.

---

## 1. Philosophy

OpenAuthor is **permissive by default and transparent by design**. There are no bans on AI-generated content. There is no editorial gatekeeping. The only requirement is honest authorship disclosure. Readers decide what they trust.

The quality signal comes from certificates. Certificate issuers — journals, tools, reviewers, automated systems — bear reputational costs for issuing bad ones. Over time, a market of issuers will emerge, and readers will learn which issuers to trust. OpenAuthor does not pick winners. It is infrastructure: it stores and displays certificates neutrally, shows the issuer clearly, and gets out of the way.

Mechanism design is hard. Voluntary transparency is tractable. We do the tractable thing.

---

## 2. Core Concepts

### 2.1 Papers

A paper on OpenAuthor is a submission with:

- A **PDF**
- An **author list** — each author tagged as `human` or `ai`
- A **metadata block** (title, abstract, subject area, date, version)
- Zero or more **certificates** (see §2.2)

Papers are versioned. Each version is immutable once submitted. A new version creates a new record linked via `parent_id` to the previous one.

### 2.2 Certificates

A certificate is a structured attestation attached to a paper by a human — either the submitting author (`issuer_type: "self"`) or an external reviewer (`issuer_type: "human_reviewer"`). AI agents cannot issue certificates.

Each certificate record:

```json
{
  "certificate_type": "ai_usage",
  "issuer_name": "AI Tool Disclosure",
  "issuer_url": "https://ai-cards.org",
  "issuer_type": "self",
  "issuer_display_name": "Isabel Dahlgren",
  "issued_at": "2026-06-11T00:00:00Z",
  "payload": { ... }
}
```

The platform validates `certificate_type` against a known list (§3) and `issuer_type` against `{"self", "human_reviewer"}`. The `payload` is stored verbatim as JSON.

### 2.3 AI Authorship

```json
{
  "name": "Claude Sonnet 4.6",
  "author_type": "ai",
  "model_family": "Claude",
  "model_version": "claude-sonnet-4-6",
  "provider": "Anthropic",
  "contribution": "Proof search, draft writing"
}
```

`author_type`: `human` | `ai`

There is no rule about ratios. A paper can have zero human authors.

---

## 3. Certificate Types

Five certificate types are currently supported:

| Type | Label | Issuer |
|---|---|---|
| `ai_usage` | AI Tool Disclosure | [AI Cards](https://ai-cards.org) standard |
| `peer_review` | Peer Review | Human reviewer |
| `proof_verification` | Proof Verification | Human reader |
| `formal_verification` | Formal Verification | Human + proof assistant |
| `citation_check` | Citation Check | Human reviewer |

The data model accommodates additional types without schema changes. New types are added in `CERT_TYPE_META` (backend) and the payload renderer map (frontend).

---

## 4. Tech Stack

### Backend
- **Language**: Python (FastAPI)
- **Database**: PostgreSQL (SQLAlchemy)
- **File storage**: local `backend/uploads/`, served at `/files/<uuid>.pdf`
- **Auth**: email/password, JWT tokens

### Frontend
- **Framework**: Next.js 16 (App Router)

### API

```
POST /api/v1/papers
POST /api/v1/papers/:id/certificates
GET  /api/v1/papers
GET  /api/v1/papers/:id
GET  /api/v1/papers/:id/certificates
```

---

## 5. Submission Flow

1. Author logs in (email/password)
2. Uploads PDF, fills title/abstract/subject area, adds authors (human or AI with model info)
3. Paper is immediately public
4. Certificates can be added at any time — by the submitter (`issuer_type: "self"`) or any logged-in human reviewer (`issuer_type: "human_reviewer"`)

---

## 6. Display

### Paper page

- Title, authors (with AI badge + model/provider), abstract, date, version history
- Certificate panel: all attached certificates, each expandable, showing issuer, date, and payload
- BibTeX export

### Feed

- Chronological list of submissions
- Shows title, authors, abstract excerpt, subject area, certificate count

---

## 7. What OpenAuthor Does NOT Do (v1)

- No moderation or editorial filtering (except a minimal content policy — see §9)
- No quality scores
- No AI-detection
- No paywalls or submission fees
- No certificate validation beyond JSON schema conformance
- No enforcement of any disclosure standard

---

## 8. Open Questions

- **Moderation floor**: no-moderation is clean in principle. In practice, CSAM or incitement could arrive. A minimal content policy (not epistemic, just legal) is needed before wider launch.
- **BibTeX / citation format for AI authors**: no standard exists. OpenAuthor should propose one.
- **ORCID for AI**: ORCID doesn't issue iDs for non-humans. Mint our own AI author identifiers?
- **Certificate spam**: open certificates mean anyone can issue a fake "peer reviewed" certificate. Primary mitigation: display always shows issuer URL prominently, readers judge. Secondary: schema registry can be curated over time if spam becomes a problem.
- **Long-term preservation**: consider early partnership with Internet Archive or a university library.

---

## 9. Proposed Improvements

Drawn from the [Leiden Declaration on Artificial Intelligence and Mathematics](https://leidendeclaration.ai) and the workshop paper ["Shaping the Future of Mathematics in the Age of AI"](https://arxiv.org/abs/2603.24914) (arXiv 2603.24914).

### 9.1 Homepage — mission lede

The feed currently starts with "Recent Submissions". Add a two-sentence mission statement above it, visible without scrolling — analogous to the Leiden Declaration's preamble. Readers landing for the first time need to immediately understand what OpenAuthor is and why authorship transparency matters. The lede should be static prose, not a hero banner; in keeping with the mathematical journal aesthetic.

### 9.2 Standalone principles page (`/principles`)

Move the founding commitments out of the About page and onto a dedicated `/principles` route, modelled on the Leiden Declaration's declaration section: formal, numbered, linkable by anchor. Each commitment should be one sentence followed by one sentence explaining how the platform implements it. The page should carry a version date and update timestamp so it reads as a living document rather than boilerplate.

Link to it from the nav and from the About page.

### 9.3 More informative AI author display

On the feed and paper pages, AI authors currently show as `AI: Claude Sonnet 4.6`. Show the provider inline — `Claude Sonnet 4.6 (Anthropic)` — and make the model name a link to the provider's model card where a canonical URL exists. The arXiv paper emphasises that attribution and provenance are core mathematical values; AI model provenance should be treated with the same rigour as human institutional affiliation.

### 9.4 ORCID links for human issuers

Certificate issuers who are human reviewers should display an ORCID link (🔗 orcid.org/...) next to their name, analogous to the Leiden Declaration's signatory list. This is the primary trust signal for the reviewer model. Requires storing an optional `issuer_orcid` field on certificates and rendering it in the certificate panel.

### 9.5 Computational resource disclosure certificate

The arXiv paper identifies computational resource disclosure as an emerging ethical obligation — "who paid for the compute, and at what environmental cost?" Add a `compute_disclosure` certificate type with a structured payload:

```json
{
  "model": "claude-sonnet-4-6",
  "provider": "Anthropic",
  "inference_calls": 312,
  "total_input_tokens": 1400000,
  "total_output_tokens": 210000,
  "estimated_co2_kg": 0.14
}
```

Self-declared by the submitter. No validation beyond schema conformance, consistent with the platform's philosophy.

### 9.6 Feed filters

The feed has no filters. Add three toggles above the list:
- **Authorship**: All / Human only / AI-involved
- **Subject area**: dropdown (MSC top-level codes)
- **Certificates**: Any / Has certificates / Has peer review

These can be client-side filters on the already-loaded list for now; move to query parameters once the paper count warrants server-side filtering.

### 9.7 Public API documentation page (`/api-docs`)

The arXiv paper's recommendation for community-owned, transparent infrastructure applies here. A plain `/api-docs` page listing the REST endpoints with example `curl` commands signals that OpenAuthor is infrastructure, not a walled garden. It also makes programmatic AI submissions self-service. No third-party tooling (Swagger UI) needed — a static page with code blocks is enough.

### 9.8 Versioned schema registry (`/schemas`)

A public listing of all supported certificate schema types, each with:
- Schema version
- JSON schema (linkable)
- Human-readable description of what it attests

This operationalises the "anyone can define a schema" principle in §2.2 and gives external issuers a concrete target to build against. Implemented as a static page for v1; a database-backed registry for later versions.

---

## 10. Milestones

| Milestone | Status | Scope |
|---|---|---|
| M0 — Schema | ✓ done | Define AI disclosure JSON schema |
| M1 — MVP | ✓ done | Submit paper, attach certificate, view paper page. No auth, no search. |
| M2 — Auth | in progress | Email/password login, registration, JWT sessions |
| M3 — Email verification | planned | Verify email on registration; gate certificate issuance on verified accounts |
| M4 — Browse + Search | planned | Feed filters (§9.6), full-text search |
| M5 — Principles + Docs | planned | `/principles` page (§10.2), `/api-docs` (§10.7), `/schemas` registry (§10.8) |
| M6 — Trust signals | planned | ORCID on certificate issuers (§10.4), compute disclosure cert type (§10.5) |
