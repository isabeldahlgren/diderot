const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000") + "/api/v1";

export type AuthorType = "human" | "ai";
export type IssuerType = "self" | "human_reviewer";
export type CertificateType = "ai_usage" | "proof_verification" | "formal_verification" | "citation_check";

export interface Author {
  id: string;
  paper_id: string;
  name: string;
  author_type: AuthorType;
  model_family?: string;
  model_version?: string;
  provider?: string;
  contribution?: string;
  user_id?: string;
}

export interface Certificate {
  id: string;
  paper_id: string;
  certificate_type: string;
  issuer_name: string;
  issuer_url: string;
  issuer_type: IssuerType;
  issuer_user_id?: string;
  issuer_display_name?: string;
  issued_at: string;
  payload: Record<string, unknown>;
  version: number;
}

export interface Paper {
  id: string;
  title: string;
  abstract: string;
  subject_area: string;
  created_at: string;
  version: number;
  parent_id?: string;
  root_id?: string;
  pdf_filename?: string;
  submitter_user_id?: string;
  authors: Author[];
  certificates: Certificate[];
}

export interface PaperListItem {
  id: string;
  title: string;
  abstract: string;
  subject_area: string;
  created_at: string;
  version: number;
  root_id?: string;
  submitter_user_id?: string;
  authors: Author[];
  certificate_count: number;
}

export interface UserPublic {
  id: string;
  name: string;
  created_at: string;
}

export async function listPapers(): Promise<PaperListItem[]> {
  const res = await fetch(`${API}/papers`);
  if (!res.ok) throw new Error("Failed to fetch papers");
  return res.json();
}

export async function getPaper(id: string): Promise<Paper> {
  const res = await fetch(`${API}/papers/${id}`);
  if (!res.ok) throw new Error("Paper not found");
  return res.json();
}

export async function getPaperVersions(id: string): Promise<PaperListItem[]> {
  const res = await fetch(`${API}/papers/${id}/versions`);
  if (!res.ok) throw new Error("Failed to fetch versions");
  return res.json();
}

export async function lookupUserByEmail(email: string): Promise<UserPublic> {
  const res = await fetch(`${API}/users/lookup?email=${encodeURIComponent(email)}`);
  if (!res.ok) throw new Error("No account found with that email");
  return res.json();
}

export async function getUser(userId: string): Promise<UserPublic> {
  const res = await fetch(`${API}/users/${userId}`);
  if (!res.ok) throw new Error("User not found");
  return res.json();
}

export async function getUserPapers(userId: string): Promise<PaperListItem[]> {
  const res = await fetch(`${API}/users/${userId}/papers`);
  if (!res.ok) throw new Error("Failed to fetch user papers");
  return res.json();
}

export async function getUserReviewedPapers(userId: string): Promise<PaperListItem[]> {
  const res = await fetch(`${API}/users/${userId}/reviewed`);
  if (!res.ok) throw new Error("Failed to fetch reviewed papers");
  return res.json();
}


export interface Comment {
  id: string;
  paper_id: string;
  author_user_id?: string;
  author_name: string;
  body: string;
  created_at: string;
}

export async function getComments(paperId: string): Promise<Comment[]> {
  const res = await fetch(`${API}/papers/${paperId}/comments`);
  if (!res.ok) throw new Error("Failed to fetch comments");
  return res.json();
}

export async function addComment(paperId: string, body: string, token: string): Promise<Comment> {
  const res = await fetch(`${API}/papers/${paperId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to post comment");
  }
  return res.json();
}

export async function submitPaper(data: {
  title: string;
  abstract: string;
  subject_area: string;
  authors: Omit<Author, "id" | "paper_id">[];
  pdf: File;
  token: string;
  parent_id?: string;
}): Promise<Paper> {
  const form = new FormData();
  form.append("title", data.title);
  form.append("abstract", data.abstract);
  form.append("subject_area", data.subject_area);
  form.append("authors", JSON.stringify(data.authors));
  form.append("pdf", data.pdf);
  if (data.parent_id) form.append("parent_id", data.parent_id);

  const res = await fetch(`${API}/papers`, {
    method: "POST",
    headers: { Authorization: `Bearer ${data.token}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Submission failed");
  }
  return res.json();
}

export async function addCertificate(
  paperId: string,
  issuer_type: IssuerType,
  certificate_type: CertificateType,
  payload: Record<string, unknown>,
  token: string,
): Promise<Certificate> {
  const res = await fetch(`${API}/papers/${paperId}/certificates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ issuer_type, certificate_type, payload }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to add certificate");
  }
  return res.json();
}
